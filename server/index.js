import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import express from 'express';
import { config } from './config.js';
import { createAuthToken, verifyAuthToken } from './auth.js';
import { closePool, getPool } from './db.js';
import { initializeDatabase } from './initDb.js';
import { serializeRow, serializeRows, toPublicUser } from './serializers.js';

const app = express();
app.use(express.json({ limit: '1mb' }));

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
};

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

const buildSortClause = (sortValue, allowedFields, fallbackField = 'created_date') => {
  const raw = typeof sortValue === 'string' && sortValue.length > 0 ? sortValue : `-${fallbackField}`;
  const descending = raw.startsWith('-');
  const field = descending ? raw.slice(1) : raw;
  const safeField = allowedFields.includes(field) ? field : fallbackField;
  return `ORDER BY ${safeField} ${descending ? 'DESC' : 'ASC'}`;
};

const getTokenFromRequest = (req) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return null;
  }

  return header.slice('Bearer '.length).trim();
};

const asyncHandler = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    next(error);
  }
};

const getUserById = async (id) => {
  const pool = getPool();
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
};

app.use(
  asyncHandler(async (req, _res, next) => {
    const token = getTokenFromRequest(req);

    if (!token) {
      return next();
    }

    try {
      const payload = verifyAuthToken(token);
      const userRow = await getUserById(payload.sub);
      const prestadorInativo =
        userRow &&
        userRow.tipo === 'prestador' &&
        !(userRow.ativo === true || userRow.ativo === 1);

      if (prestadorInativo) {
        req.currentUser = null;
        return next();
      }

      req.currentUser = toPublicUser(userRow);
    } catch {
      req.currentUser = null;
    }

    next();
  })
);

const requireAuth = (req, res, next) => {
  if (!req.currentUser) {
    return res.status(401).json({ message: 'Não autenticado.' });
  }

  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.currentUser || req.currentUser.tipo !== 'admin') {
    return res.status(403).json({ message: 'Acesso restrito para administradores.' });
  }

  return next();
};

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post(
  '/api/auth/register',
  asyncHandler(async (req, res) => {
    const { full_name, email, password, tipo, cpf, cnpj, nome_empresa } = req.body ?? {};

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
    }

    const allowedTipos = ['cliente', 'prestador'];
    if (tipo !== undefined && !allowedTipos.includes(String(tipo))) {
      return res.status(400).json({ message: 'Tipo de conta inválido.' });
    }

    const normalizedTipo = tipo === 'prestador' ? 'prestador' : 'cliente';
    const cpfValue = String(cpf || '').trim();
    const cnpjValue = String(cnpj || '').trim();
    const nomeEmpresaValue = String(nome_empresa || '').trim();
    const ativoValue = normalizedTipo === 'prestador' ? false : true;

    if (!cpfValue) {
      return res.status(400).json({ message: 'CPF é obrigatório.' });
    }
    if (onlyDigits(cpfValue).length !== 11) {
      return res.status(400).json({ message: 'CPF inválido.' });
    }

    if (!cnpjValue) {
      return res.status(400).json({ message: 'CNPJ é obrigatório.' });
    }
    if (onlyDigits(cnpjValue).length !== 14) {
      return res.status(400).json({ message: 'CNPJ inválido.' });
    }

    if (normalizedTipo === 'prestador' && !nomeEmpresaValue) {
      return res.status(400).json({ message: 'Nome da empresa é obrigatório para prestador.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'A senha precisa ter pelo menos 6 caracteres.' });
    }

    const pool = getPool();
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(String(password), 10);

    try {
      await pool.query(
        `INSERT INTO users (id, full_name, email, password_hash, tipo, cpf, cnpj, nome_empresa, ativo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          String(full_name).trim(),
          String(email).trim().toLowerCase(),
          passwordHash,
          normalizedTipo,
          cpfValue,
          cnpjValue,
          normalizedTipo === 'prestador' ? nomeEmpresaValue : null,
          ativoValue,
        ]
      );
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ message: 'Este email já está cadastrado.' });
      }

      throw error;
    }

    const userRow = await getUserById(userId);
    const user = toPublicUser(userRow);
    const token = ativoValue ? createAuthToken(user) : null;

    return res.status(201).json({ user, token });
  })
);

app.post(
  '/api/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
    }

    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [
      String(email).trim().toLowerCase(),
    ]);

    const userRow = rows[0];
    if (!userRow) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    const passwordValid = await bcrypt.compare(String(password), userRow.password_hash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }

    if (userRow.tipo === 'prestador' && !(userRow.ativo === true || userRow.ativo === 1)) {
      return res.status(403).json({
        message: 'Seu cadastro de prestador está inativo. Procure o administrador.',
      });
    }

    const user = toPublicUser(userRow);
    const token = createAuthToken(user);

    return res.json({ user, token });
  })
);

app.post('/api/auth/logout', (_req, res) => {
  res.status(204).end();
});

app.get(
  '/api/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.currentUser });
  })
);

app.patch(
  '/api/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const allowedFields = [
      'telefone',
      'cpf',
      'cnpj',
      'nome_empresa',
      'data_nascimento',
      'rua',
      'numero',
      'complemento',
      'bairro',
      'cidade',
      'estado',
      'cep',
      'tipo',
      'avatar',
    ];

    const payload = req.body ?? {};
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        if (field === 'tipo') {
          const validTipos = ['cliente', 'prestador'];
          if (req.currentUser.tipo === 'admin') {
            validTipos.push('admin');
          }
          if (!validTipos.includes(payload[field])) {
            return res.status(400).json({ message: 'Tipo de conta inválido.' });
          }
        }

        updates.push(`${field} = ?`);
        values.push(payload[field] === '' ? null : payload[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo válido para atualizar.' });
    }

    values.push(req.currentUser.id);

    const pool = getPool();
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    const updatedUserRow = await getUserById(req.currentUser.id);
    const user = toPublicUser(updatedUserRow);

    return res.json({ user });
  })
);

app.get(
  '/api/users',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const sortClause = buildSortClause(req.query.sort, ['created_date', 'full_name', 'email', 'tipo', 'ativo']);
    const [rows] = await pool.query(`SELECT * FROM users ${sortClause}`);
    res.json({ items: serializeRows(rows).map((row) => toPublicUser(row)) });
  })
);

app.patch(
  '/api/users/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = req.body ?? {};
    const hasAtivo = Object.prototype.hasOwnProperty.call(payload, 'ativo');
    const hasTipo = Object.prototype.hasOwnProperty.call(payload, 'tipo');

    if (!hasAtivo && !hasTipo) {
      return res.status(400).json({ message: 'Nenhum campo válido para atualizar.' });
    }

    const pool = getPool();
    const [existingRows] = await pool.query('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
    const existing = existingRows[0];

    if (!existing) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const updates = [];
    const values = [];

    if (hasTipo) {
      const nextTipo = String(payload.tipo);
      const validTipos = ['cliente', 'admin'];
      const sourceTipos = ['cliente', 'admin'];

      if (!validTipos.includes(nextTipo)) {
        return res.status(400).json({ message: 'Conversão de tipo inválida.' });
      }

      if (!sourceTipos.includes(existing.tipo)) {
        return res.status(400).json({ message: 'Apenas clientes e admins podem ter tipo alterado.' });
      }

      updates.push('tipo = ?');
      values.push(nextTipo);
    }

    let ativo = null;
    if (hasAtivo) {
      ativo = parseBoolean(payload.ativo);
      if (typeof ativo !== 'boolean') {
        return res.status(400).json({ message: 'Campo "ativo" inválido.' });
      }

      if (existing.tipo !== 'prestador') {
        return res.status(400).json({ message: 'Apenas prestadores podem ter status ativo/inativo.' });
      }

      updates.push('ativo = ?');
      values.push(ativo);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo válido para atualizar.' });
    }

    values.push(id);
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    if (hasAtivo) {
      await pool.query('UPDATE prestadores SET ativo = ? WHERE user_id = ? OR user_email = ?', [
        ativo,
        id,
        existing.email,
      ]);
    }

    const updatedUserRow = await getUserById(id);
    return res.json({ item: toPublicUser(updatedUserRow) });
  })
);

app.get(
  '/api/categorias',
  asyncHandler(async (req, res) => {
    const filters = [];
    const values = [];

    const ativo = parseBoolean(req.query.ativo);
    if (typeof ativo === 'boolean') {
      filters.push('ativo = ?');
      values.push(ativo);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const sortClause = buildSortClause(req.query.sort, ['created_date', 'nome', 'ativo'], 'nome');

    const pool = getPool();
    const [rows] = await pool.query(`SELECT * FROM categorias ${whereClause} ${sortClause}`, values);

    res.json({ items: serializeRows(rows) });
  })
);

app.post(
  '/api/categorias',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { nome, icone, ativo } = req.body ?? {};

    if (!nome) {
      return res.status(400).json({ message: 'Nome da categoria é obrigatório.' });
    }

    const id = randomUUID();
    const pool = getPool();

    await pool.query('INSERT INTO categorias (id, nome, icone, ativo) VALUES (?, ?, ?, ?)', [
      id,
      String(nome).trim(),
      icone || 'User',
      typeof ativo === 'boolean' ? ativo : true,
    ]);

    const [rows] = await pool.query('SELECT * FROM categorias WHERE id = ? LIMIT 1', [id]);
    res.status(201).json({ item: serializeRow(rows[0]) });
  })
);

app.patch(
  '/api/categorias/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const payload = req.body ?? {};
    const allowedFields = ['nome', 'icone', 'ativo'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        updates.push(`${field} = ?`);
        values.push(payload[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo válido para atualizar.' });
    }

    values.push(id);
    const pool = getPool();
    await pool.query(`UPDATE categorias SET ${updates.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.query('SELECT * FROM categorias WHERE id = ? LIMIT 1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }

    await pool.query(
      `UPDATE prestadores p
       JOIN categorias c ON c.id = p.categoria_id
       SET p.categoria_nome = c.nome
       WHERE p.categoria_id = ?`,
      [id]
    );

    res.json({ item: serializeRow(rows[0]) });
  })
);

app.delete(
  '/api/categorias/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const pool = getPool();

    const [prestadorRows] = await pool.query('SELECT COUNT(*) AS total FROM prestadores WHERE categoria_id = ?', [id]);
    if (prestadorRows[0]?.total > 0) {
      return res
        .status(409)
        .json({ message: 'Não é possível excluir categoria vinculada a prestadores.' });
    }

    const [result] = await pool.query('DELETE FROM categorias WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Categoria não encontrada.' });
    }

    return res.status(204).end();
  })
);

app.get(
  '/api/prestadores',
  asyncHandler(async (req, res) => {
    const allowedFilters = ['id', 'user_email', 'categoria_id', 'ativo', 'destaque'];
    const filters = [];
    const values = [];

    for (const key of allowedFilters) {
      if (Object.prototype.hasOwnProperty.call(req.query, key)) {
        if (key === 'ativo' || key === 'destaque') {
          const boolValue = parseBoolean(req.query[key]);
          if (typeof boolValue === 'boolean') {
            filters.push(`${key} = ?`);
            values.push(boolValue);
          }
        } else {
          filters.push(`${key} = ?`);
          values.push(req.query[key]);
        }
      }
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const sortClause = buildSortClause(
      req.query.sort,
      ['created_date', 'nome', 'preco_base', 'destaque'],
      'created_date'
    );

    const pool = getPool();
    const [rows] = await pool.query(`SELECT * FROM prestadores ${whereClause} ${sortClause}`, values);

    res.json({ items: serializeRows(rows) });
  })
);

app.post(
  '/api/prestadores',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = req.body ?? {};
    const requiredFields = ['nome', 'categoria_id', 'telefone'];

    for (const field of requiredFields) {
      if (!payload[field]) {
        return res.status(400).json({ message: `Campo obrigatório: ${field}` });
      }
    }

    const pool = getPool();
    const id = randomUUID();

    const [categoriaRows] = await pool.query('SELECT nome FROM categorias WHERE id = ? LIMIT 1', [
      payload.categoria_id,
    ]);
    const categoriaNome = categoriaRows[0]?.nome || payload.categoria_nome || null;

    const fotosTrabalhos = Array.isArray(payload.fotos_trabalhos)
      ? JSON.stringify(payload.fotos_trabalhos)
      : JSON.stringify([]);
    const servicos = Array.isArray(payload.servicos) ? JSON.stringify(payload.servicos) : JSON.stringify([]);

    const isAdmin = req.currentUser.tipo === 'admin';
    const ativoValue =
      isAdmin && Object.prototype.hasOwnProperty.call(payload, 'ativo')
        ? payload.ativo !== false
        : true;

    await pool.query(
      `INSERT INTO prestadores (
        id,
        user_id,
        user_email,
        nome,
        cpf,
        data_nascimento,
        telefone,
        nome_empresa,
        cnpj,
        tipo_empresa,
        categoria_id,
        categoria_nome,
        descricao,
        servicos,
        valor_hora,
        preco_base,
        tempo_medio_atendimento,
        dias_disponiveis,
        horarios_disponiveis,
        rua,
        numero,
        bairro,
        cidade,
        estado,
        cep,
        raio_atendimento,
        foto,
        foto_facial,
        foto_documento,
        logo_empresa,
        fotos_trabalhos,
        avaliacao,
        destaque,
        status_aprovacao,
        ativo,
        latitude,
        longitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        req.currentUser.id,
        req.currentUser.email,
        payload.nome,
        payload.cpf || null,
        payload.data_nascimento || null,
        payload.telefone,
        payload.nome_empresa || null,
        payload.cnpj || null,
        payload.tipo_empresa || null,
        payload.categoria_id,
        categoriaNome,
        payload.descricao || null,
        servicos,
        payload.valor_hora || null,
        payload.preco_base || null,
        payload.tempo_medio_atendimento || null,
        payload.dias_disponiveis || null,
        payload.horarios_disponiveis || null,
        payload.rua || null,
        payload.numero || null,
        payload.bairro || null,
        payload.cidade || null,
        payload.estado || null,
        payload.cep || null,
        payload.raio_atendimento || null,
        payload.foto || null,
        payload.foto_facial || null,
        payload.foto_documento || null,
        payload.logo_empresa || null,
        fotosTrabalhos,
        payload.avaliacao ?? 5,
        Boolean(payload.destaque),
        payload.status_aprovacao || 'pendente',
        ativoValue,
        payload.latitude || null,
        payload.longitude || null,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM prestadores WHERE id = ? LIMIT 1', [id]);
    res.status(201).json({ item: serializeRow(rows[0]) });
  })
);

app.patch(
  '/api/prestadores/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const pool = getPool();

    const [existingRows] = await pool.query('SELECT * FROM prestadores WHERE id = ? LIMIT 1', [id]);
    const existing = existingRows[0];

    if (!existing) {
      return res.status(404).json({ message: 'Prestador não encontrado.' });
    }

    const isOwner = req.currentUser.email === existing.user_email;
    const isAdmin = req.currentUser.tipo === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Sem permissão para atualizar este prestador.' });
    }

    const payload = req.body ?? {};
    const allowedFields = [
      'nome',
      'cpf',
      'data_nascimento',
      'telefone',
      'nome_empresa',
      'cnpj',
      'tipo_empresa',
      'categoria_id',
      'categoria_nome',
      'descricao',
      'servicos',
      'valor_hora',
      'preco_base',
      'tempo_medio_atendimento',
      'dias_disponiveis',
      'horarios_disponiveis',
      'rua',
      'numero',
      'bairro',
      'cidade',
      'estado',
      'cep',
      'raio_atendimento',
      'foto',
      'foto_facial',
      'foto_documento',
      'logo_empresa',
      'fotos_trabalhos',
      'avaliacao',
      'destaque',
      'status_aprovacao',
      'ativo',
      'latitude',
      'longitude',
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        if (field === 'ativo' && !isAdmin) {
          continue;
        }

        if (field === 'fotos_trabalhos') {
          updates.push(`${field} = ?`);
          values.push(JSON.stringify(Array.isArray(payload[field]) ? payload[field] : []));
          continue;
        }

        if (field === 'servicos') {
          updates.push(`${field} = ?`);
          values.push(JSON.stringify(Array.isArray(payload[field]) ? payload[field] : []));
          continue;
        }

        updates.push(`${field} = ?`);
        values.push(payload[field] === '' ? null : payload[field]);
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'categoria_id')) {
      const [categoriaRows] = await pool.query('SELECT nome FROM categorias WHERE id = ? LIMIT 1', [
        payload.categoria_id,
      ]);
      updates.push('categoria_nome = ?');
      values.push(categoriaRows[0]?.nome || payload.categoria_nome || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo válido para atualizar.' });
    }

    values.push(id);
    await pool.query(`UPDATE prestadores SET ${updates.join(', ')} WHERE id = ?`, values);

    if (isAdmin && Object.prototype.hasOwnProperty.call(payload, 'ativo')) {
      const ativo = parseBoolean(payload.ativo);
      if (typeof ativo === 'boolean') {
        await pool.query('UPDATE users SET ativo = ? WHERE id = ? OR email = ?', [
          ativo,
          existing.user_id,
          existing.user_email,
        ]);
      }
    }

    const [updatedRows] = await pool.query('SELECT * FROM prestadores WHERE id = ? LIMIT 1', [id]);
    res.json({ item: serializeRow(updatedRows[0]) });
  })
);

app.get(
  '/api/solicitacoes',
  requireAuth,
  asyncHandler(async (req, res) => {
    const filters = [];
    const values = [];

    if (req.query.cliente_email) {
      filters.push('cliente_email = ?');
      values.push(req.query.cliente_email);
    }

    if (req.query.prestador_email) {
      filters.push('prestador_email = ?');
      values.push(req.query.prestador_email);
    }

    if (req.query.status) {
      filters.push('status = ?');
      values.push(req.query.status);
    }

    if (req.currentUser.tipo !== 'admin') {
      const userEmail = req.currentUser.email;

      if (req.query.cliente_email && req.query.cliente_email !== userEmail) {
        return res.status(403).json({ message: 'Sem permissão para esta consulta.' });
      }

      if (req.query.prestador_email && req.query.prestador_email !== userEmail) {
        return res.status(403).json({ message: 'Sem permissão para esta consulta.' });
      }

      if (!req.query.cliente_email && !req.query.prestador_email) {
        filters.push('(cliente_email = ? OR prestador_email = ?)');
        values.push(userEmail, userEmail);
      }
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const sortClause = buildSortClause(
      req.query.sort,
      ['created_date', 'status', 'preco_proposto', 'preco_acordado'],
      'created_date'
    );

    const pool = getPool();
    const [rows] = await pool.query(`SELECT * FROM solicitacoes ${whereClause} ${sortClause}`, values);

    res.json({ items: serializeRows(rows) });
  })
);

app.post(
  '/api/solicitacoes',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = req.body ?? {};

    if (!payload.prestador_id || !payload.descricao) {
      return res.status(400).json({ message: 'Prestador e descrição são obrigatórios.' });
    }

    const pool = getPool();
    const [prestadorRows] = await pool.query('SELECT * FROM prestadores WHERE id = ? LIMIT 1', [
      payload.prestador_id,
    ]);
    const prestador = prestadorRows[0];

    if (!prestador) {
      return res.status(404).json({ message: 'Prestador não encontrado.' });
    }

    const id = randomUUID();

    await pool.query(
      `INSERT INTO solicitacoes (
        id,
        cliente_id,
        cliente_email,
        cliente_nome,
        prestador_id,
        prestador_email,
        prestador_nome,
        categoria_nome,
        descricao,
        preco_proposto,
        preco_acordado,
        status,
        resposta_prestador
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        id,
        req.currentUser.id,
        req.currentUser.email,
        req.currentUser.full_name,
        prestador.id,
        prestador.user_email,
        prestador.nome,
        prestador.categoria_nome,
        payload.descricao,
        payload.preco_proposto || prestador.preco_base || null,
        payload.preco_acordado || null,
        payload.status || 'aberto',
        payload.resposta_prestador || null,
      ]
    );

    const [rows] = await pool.query('SELECT * FROM solicitacoes WHERE id = ? LIMIT 1', [id]);
    res.status(201).json({ item: serializeRow(rows[0]) });
  })
);

app.patch(
  '/api/solicitacoes/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = req.params.id;
    const pool = getPool();

    const [existingRows] = await pool.query('SELECT * FROM solicitacoes WHERE id = ? LIMIT 1', [id]);
    const existing = existingRows[0];

    if (!existing) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }

    const isAdmin = req.currentUser.tipo === 'admin';
    const isCliente = req.currentUser.email === existing.cliente_email;
    const isPrestador = req.currentUser.email === existing.prestador_email;

    if (!isAdmin && !isCliente && !isPrestador) {
      return res.status(403).json({ message: 'Sem permissão para atualizar esta solicitação.' });
    }

    const payload = req.body ?? {};
    const allowedFields = ['status', 'preco_acordado', 'resposta_prestador', 'preco_proposto'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        updates.push(`${field} = ?`);
        values.push(payload[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo válido para atualizar.' });
    }

    values.push(id);
    await pool.query(`UPDATE solicitacoes SET ${updates.join(', ')} WHERE id = ?`, values);

    const [updatedRows] = await pool.query('SELECT * FROM solicitacoes WHERE id = ? LIMIT 1', [id]);
    res.json({ item: serializeRow(updatedRows[0]) });
  })
);

app.post('/api/events', (_req, res) => {
  res.status(204).end();
});

app.use((error, _req, res, _next) => {
  const statusCode = Number(error?.status) || 500;
  const message = error?.message || 'Erro interno do servidor.';
  if (statusCode >= 500) {
    console.error(error);
  }

  res.status(statusCode).json({ message });
});

const maybeServeStatic = () => {
  const distPath = path.resolve(process.cwd(), 'dist');
  const indexFile = path.join(distPath, 'index.html');

  if (!fs.existsSync(indexFile)) {
    return;
  }

  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }

    return res.sendFile(indexFile);
  });
};

const startServer = async () => {
  await initializeDatabase();
  maybeServeStatic();

  app.listen(config.port, () => {
    console.log(`ServiJá API rodando em http://localhost:${config.port}`);
  });
};

const gracefulShutdown = async () => {
  await closePool();
  process.exit(0);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

startServer().catch(async (error) => {
  console.error('Falha ao iniciar servidor:', error);
  await closePool();
  process.exit(1);
});
