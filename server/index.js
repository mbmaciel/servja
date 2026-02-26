import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import express from 'express';
import { config } from './config.js';
import { createAuthToken, verifyAuthToken } from './auth.js';
import { closePool, getPool } from './db.js';
import { initializeDatabase } from './initDb.js';
import { router as atividadesRouter, initAtividadesTable } from './routes/atividades.js';
import { serializeRow, serializeRows, toPublicUser } from './serializers.js';
import { geocodeByCep } from './services/geocodeService.js';
import { sendWelcomeEmail, notifyAdmins } from './services/emailService.js';

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
const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const parseNullable = (value) => (value === '' ? null : value);
const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object ?? {}, key);
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const isValidDateOnly = (value) => {
  if (!DATE_ONLY_REGEX.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() + 1 === month &&
    date.getUTCDate() === day
  );
};

const normalizeDateOnly = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const datePrefixMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (datePrefixMatch?.[1] && isValidDateOnly(datePrefixMatch[1])) {
    return datePrefixMatch[1];
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  const normalized = parsed.toISOString().slice(0, 10);
  return isValidDateOnly(normalized) ? normalized : undefined;
};

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

const getPrestadorByOwner = async (pool, userId, userEmail) => {
  const normalizedEmail = normalizeEmail(userEmail);
  const [rows] = await pool.query(
    `SELECT * FROM prestadores
     WHERE user_id = ? OR LOWER(TRIM(user_email)) = ?
     ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END, created_date ASC
     LIMIT 1`,
    [userId, normalizedEmail, userId]
  );

  return rows[0] || null;
};

const resolveCategoriaNome = async (pool, categoriaId, fallbackName = null) => {
  if (!categoriaId) {
    return fallbackName || null;
  }

  const [categoriaRows] = await pool.query('SELECT nome FROM categorias WHERE id = ? LIMIT 1', [categoriaId]);
  return categoriaRows[0]?.nome || fallbackName || null;
};

const syncPrestadorOwnership = async (pool, prestador, userId, userEmail) => {
  const normalizedEmail = normalizeEmail(userEmail);
  const currentPrestadorEmail = normalizeEmail(prestador?.user_email);

  if (!prestador) {
    return null;
  }

  if (prestador.user_id === userId && currentPrestadorEmail === normalizedEmail) {
    return prestador;
  }

  await pool.query('UPDATE prestadores SET user_id = ?, user_email = ? WHERE id = ?', [
    userId,
    normalizedEmail,
    prestador.id,
  ]);

  const [rows] = await pool.query('SELECT * FROM prestadores WHERE id = ? LIMIT 1', [prestador.id]);
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
    const {
      full_name, email, password, tipo,
      telefone, cep,
      rua, bairro, cidade, estado, numero, complemento,
    } = req.body ?? {};

    if (!full_name || !email || !password) {
      return res.status(400).json({ message: 'Nome, email e senha são obrigatórios.' });
    }

    const allowedTipos = ['cliente', 'prestador'];
    if (tipo !== undefined && !allowedTipos.includes(String(tipo))) {
      return res.status(400).json({ message: 'Tipo de conta inválido.' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: 'A senha precisa ter pelo menos 6 caracteres.' });
    }

    const telefoneValue = String(telefone || '').trim();
    if (!telefoneValue) {
      return res.status(400).json({ message: 'Telefone é obrigatório.' });
    }

    const cepDigits = onlyDigits(cep || '');
    if (cepDigits.length < 8) {
      return res.status(400).json({ message: 'CEP é obrigatório.' });
    }

    const normalizedTipo = tipo === 'prestador' ? 'prestador' : 'cliente';
    const ruaValue = String(rua || '').trim() || null;
    const bairroValue = String(bairro || '').trim() || null;
    const cidadeValue = String(cidade || '').trim() || null;
    const estadoValue = String(estado || '').trim().toUpperCase() || null;
    const numeroValue = String(numero || '').trim() || null;
    const complementoValue = String(complemento || '').trim() || null;

    const pool = getPool();
    const userId = randomUUID();
    const passwordHash = await bcrypt.hash(String(password), 10);
    const plainPassword = String(password);

    try {
      await pool.query(
        `INSERT INTO users
          (id, full_name, email, password_hash, tipo, ativo,
           telefone, cep, rua, bairro, cidade, estado, numero, complemento)
         VALUES (?, ?, ?, ?, ?, TRUE, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          String(full_name).trim(),
          String(email).trim().toLowerCase(),
          passwordHash,
          normalizedTipo,
          telefoneValue,
          cepDigits,
          ruaValue,
          bairroValue,
          cidadeValue,
          estadoValue,
          numeroValue,
          complementoValue,
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
    const token = createAuthToken(user);

    // Geocodificação e emails em background — não bloqueiam a resposta
    setImmediate(async () => {
      try {
        const coords = await geocodeByCep({
          rua: ruaValue,
          bairro: bairroValue,
          cidade: cidadeValue,
          estado: estadoValue,
          cep: cepDigits,
        });
        if (coords) {
          await pool.query(
            'UPDATE prestadores SET latitude = ?, longitude = ? WHERE user_id = ?',
            [coords.latitude, coords.longitude, userId]
          );
        }
      } catch (err) {
        console.error('[register] Geocodificação falhou:', err.message);
      }

      try {
        await sendWelcomeEmail(userRow, plainPassword);
        await notifyAdmins(pool, userRow);
      } catch (err) {
        console.error('[register] Email falhou:', err.message);
      }
    });

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
      'full_name',
      'email',
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
    const pool = getPool();
    const currentName = req.currentUser.full_name;
    const currentEmail = req.currentUser.email;
    let nextName = currentName;
    let nextEmail = currentEmail;

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        if (field === 'full_name') {
          const normalizedName = String(payload[field] ?? '').trim();
          if (!normalizedName) {
            return res.status(400).json({ message: 'Nome é obrigatório.' });
          }
          updates.push('full_name = ?');
          values.push(normalizedName);
          nextName = normalizedName;
          continue;
        }

        if (field === 'email') {
          const normalizedEmail = String(payload[field] ?? '').trim().toLowerCase();
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

          if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ message: 'Email inválido.' });
          }

          const [emailRows] = await pool.query(
            'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1',
            [normalizedEmail, req.currentUser.id]
          );
          if (emailRows.length > 0) {
            return res.status(409).json({ message: 'Este email já está cadastrado.' });
          }

          updates.push('email = ?');
          values.push(normalizedEmail);
          nextEmail = normalizedEmail;
          continue;
        }

        if (field === 'tipo') {
          const validTipos = ['cliente', 'prestador'];
          if (req.currentUser.tipo === 'admin') {
            validTipos.push('admin');
          }
          if (!validTipos.includes(payload[field])) {
            return res.status(400).json({ message: 'Tipo de conta inválido.' });
          }
        }

        if (field === 'data_nascimento') {
          const normalizedDate = normalizeDateOnly(payload[field]);
          if (normalizedDate === undefined) {
            return res.status(400).json({ message: 'Data de nascimento inválida.' });
          }
          updates.push('data_nascimento = ?');
          values.push(normalizedDate);
          continue;
        }

        updates.push(`${field} = ?`);
        values.push(payload[field] === '' ? null : payload[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo válido para atualizar.' });
    }

    values.push(req.currentUser.id);

    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);

    if (nextEmail !== currentEmail) {
      await pool.query('UPDATE prestadores SET user_email = ? WHERE user_id = ? OR LOWER(TRIM(user_email)) = ?', [
        nextEmail,
        req.currentUser.id,
        normalizeEmail(currentEmail),
      ]);

      await pool.query(
        'UPDATE solicitacoes SET cliente_email = ? WHERE cliente_id = ? OR cliente_email = ?',
        [nextEmail, req.currentUser.id, currentEmail]
      );

      await pool.query('UPDATE solicitacoes SET prestador_email = ? WHERE prestador_email = ?', [
        nextEmail,
        currentEmail,
      ]);
    }

    if (nextName !== currentName) {
      await pool.query('UPDATE solicitacoes SET cliente_nome = ? WHERE cliente_id = ? OR cliente_email = ?', [
        nextName,
        req.currentUser.id,
        nextEmail,
      ]);

      await pool.query('UPDATE solicitacoes SET prestador_nome = ? WHERE prestador_email = ?', [
        nextName,
        nextEmail,
      ]);
    }

    const updatedUserRow = await getUserById(req.currentUser.id);
    const user = toPublicUser(updatedUserRow);

    return res.json({ user });
  })
);

app.get(
  '/api/profile/prestador',
  requireAuth,
  asyncHandler(async (req, res) => {
    const pool = getPool();
    const userRow = await getUserById(req.currentUser.id);

    if (!userRow) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const user = toPublicUser(userRow);
    const ownPrestador = await getPrestadorByOwner(pool, user.id, user.email);
    const prestador = await syncPrestadorOwnership(pool, ownPrestador, user.id, user.email);

    return res.json({
      user,
      prestador: prestador ? serializeRow(prestador) : null,
    });
  })
);

app.patch(
  '/api/profile/prestador',
  requireAuth,
  asyncHandler(async (req, res) => {
    const payload = req.body ?? {};
    const userPayload =
      payload.user && typeof payload.user === 'object' && !Array.isArray(payload.user) ? payload.user : {};
    const rawPrestadorPayload = payload.prestador;
    const prestadorPayload =
      rawPrestadorPayload && typeof rawPrestadorPayload === 'object' && !Array.isArray(rawPrestadorPayload)
        ? rawPrestadorPayload
        : {};

    const userAllowedFields = [
      'full_name',
      'email',
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

    const prestadorAllowedFields = [
      'tipo_empresa',
      'descricao',
      'servicos',
      'valor_hora',
      'preco_base',
      'tempo_medio_atendimento',
      'dias_disponiveis',
      'horarios_disponiveis',
      'raio_atendimento',
      'foto',
      'foto_facial',
      'foto_documento',
      'logo_empresa',
      'fotos_trabalhos',
      'latitude',
      'longitude',
    ];

    const pool = getPool();
    const currentUserRow = await getUserById(req.currentUser.id);

    if (!currentUserRow) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    const currentName = currentUserRow.full_name;
    const currentEmail = currentUserRow.email;
    let nextName = currentName;
    let nextEmail = currentEmail;
    const userUpdates = [];
    const userValues = [];

    for (const field of userAllowedFields) {
      if (!hasOwn(userPayload, field)) {
        continue;
      }

      if (field === 'full_name') {
        const normalizedName = String(userPayload[field] ?? '').trim();
        if (!normalizedName) {
          return res.status(400).json({ message: 'Nome é obrigatório.' });
        }
        userUpdates.push('full_name = ?');
        userValues.push(normalizedName);
        nextName = normalizedName;
        continue;
      }

      if (field === 'email') {
        const normalizedEmail = normalizeEmail(userPayload[field]);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
          return res.status(400).json({ message: 'Email inválido.' });
        }

        const [emailRows] = await pool.query('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1', [
          normalizedEmail,
          req.currentUser.id,
        ]);
        if (emailRows.length > 0) {
          return res.status(409).json({ message: 'Este email já está cadastrado.' });
        }

        userUpdates.push('email = ?');
        userValues.push(normalizedEmail);
        nextEmail = normalizedEmail;
        continue;
      }

      if (field === 'tipo') {
        const validTipos = ['cliente', 'prestador'];
        if (currentUserRow.tipo === 'admin') {
          validTipos.push('admin');
        }
        if (!validTipos.includes(userPayload[field])) {
          return res.status(400).json({ message: 'Tipo de conta inválido.' });
        }
      }

      if (field === 'data_nascimento') {
        const normalizedDate = normalizeDateOnly(userPayload[field]);
        if (normalizedDate === undefined) {
          return res.status(400).json({ message: 'Data de nascimento inválida.' });
        }
        userUpdates.push('data_nascimento = ?');
        userValues.push(normalizedDate);
        continue;
      }

      userUpdates.push(`${field} = ?`);
      userValues.push(parseNullable(userPayload[field]));
    }

    if (userUpdates.length > 0) {
      userValues.push(req.currentUser.id);
      await pool.query(`UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`, userValues);
    }

    if (nextEmail !== currentEmail) {
      await pool.query('UPDATE prestadores SET user_email = ? WHERE user_id = ? OR LOWER(TRIM(user_email)) = ?', [
        nextEmail,
        req.currentUser.id,
        normalizeEmail(currentEmail),
      ]);

      await pool.query('UPDATE solicitacoes SET cliente_email = ? WHERE cliente_id = ? OR cliente_email = ?', [
        nextEmail,
        req.currentUser.id,
        currentEmail,
      ]);

      await pool.query('UPDATE solicitacoes SET prestador_email = ? WHERE prestador_email = ?', [
        nextEmail,
        currentEmail,
      ]);
    }

    if (nextName !== currentName) {
      await pool.query('UPDATE solicitacoes SET cliente_nome = ? WHERE cliente_id = ? OR cliente_email = ?', [
        nextName,
        req.currentUser.id,
        nextEmail,
      ]);

      await pool.query('UPDATE solicitacoes SET prestador_nome = ? WHERE prestador_email = ?', [
        nextName,
        nextEmail,
      ]);
    }

    const updatedUserRow = await getUserById(req.currentUser.id);
    const updatedUser = toPublicUser(updatedUserRow);
    let prestador = await getPrestadorByOwner(pool, updatedUser.id, updatedUser.email);
    prestador = await syncPrestadorOwnership(pool, prestador, updatedUser.id, updatedUser.email);

    if (updatedUser.tipo === 'prestador') {
      const categoriaId = hasOwn(prestadorPayload, 'categoria_id')
        ? parseNullable(prestadorPayload.categoria_id)
        : prestador?.categoria_id || null;

      if (!categoriaId) {
        return res.status(400).json({ message: 'Selecione uma categoria para conta de prestador.' });
      }

      const categoriaNomeFallback = hasOwn(prestadorPayload, 'categoria_nome')
        ? parseNullable(prestadorPayload.categoria_nome)
        : prestador?.categoria_nome || null;
      const categoriaNome = await resolveCategoriaNome(pool, categoriaId, categoriaNomeFallback);
      const telefonePrestador =
        updatedUser.telefone || parseNullable(prestadorPayload.telefone) || prestador?.telefone || null;

      if (!telefonePrestador) {
        return res.status(400).json({ message: 'Telefone é obrigatório para conta de prestador.' });
      }

      if (!prestador) {
        const createdId = randomUUID();
        const servicosValue = hasOwn(prestadorPayload, 'servicos')
          ? JSON.stringify(Array.isArray(prestadorPayload.servicos) ? prestadorPayload.servicos : [])
          : JSON.stringify([]);
        const fotosTrabalhosValue = hasOwn(prestadorPayload, 'fotos_trabalhos')
          ? JSON.stringify(Array.isArray(prestadorPayload.fotos_trabalhos) ? prestadorPayload.fotos_trabalhos : [])
          : JSON.stringify([]);

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
            status_aprovacao,
            ativo,
            latitude,
            longitude
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            createdId,
            updatedUser.id,
            normalizeEmail(updatedUser.email),
            updatedUser.full_name,
            updatedUser.cpf || null,
            normalizeDateOnly(updatedUser.data_nascimento) ?? null,
            telefonePrestador,
            updatedUser.nome_empresa || null,
            updatedUser.cnpj || null,
            parseNullable(prestadorPayload.tipo_empresa) || null,
            categoriaId,
            categoriaNome,
            parseNullable(prestadorPayload.descricao) || null,
            servicosValue,
            parseNullable(prestadorPayload.valor_hora) || null,
            parseNullable(prestadorPayload.preco_base) || null,
            parseNullable(prestadorPayload.tempo_medio_atendimento) || null,
            parseNullable(prestadorPayload.dias_disponiveis) || null,
            parseNullable(prestadorPayload.horarios_disponiveis) || null,
            updatedUser.rua || null,
            updatedUser.numero || null,
            updatedUser.bairro || null,
            updatedUser.cidade || null,
            updatedUser.estado || null,
            updatedUser.cep || null,
            parseNullable(prestadorPayload.raio_atendimento) || null,
            parseNullable(prestadorPayload.foto) || null,
            parseNullable(prestadorPayload.foto_facial) || null,
            parseNullable(prestadorPayload.foto_documento) || null,
            parseNullable(prestadorPayload.logo_empresa) || null,
            fotosTrabalhosValue,
            'pendente',
            true,
            parseNullable(prestadorPayload.latitude) || null,
            parseNullable(prestadorPayload.longitude) || null,
          ]
        );

        const [createdRows] = await pool.query('SELECT * FROM prestadores WHERE id = ? LIMIT 1', [createdId]);
        prestador = createdRows[0] || null;
      } else {
        const prestadorUpdates = [];
        const prestadorValues = [];
        const setPrestadorField = (field, value) => {
          prestadorUpdates.push(`${field} = ?`);
          prestadorValues.push(value);
        };

        setPrestadorField('user_id', updatedUser.id);
        setPrestadorField('user_email', normalizeEmail(updatedUser.email));
        setPrestadorField('nome', updatedUser.full_name || prestador.nome || null);
        setPrestadorField('cpf', updatedUser.cpf || null);
        setPrestadorField('data_nascimento', normalizeDateOnly(updatedUser.data_nascimento) ?? null);
        setPrestadorField('telefone', telefonePrestador);
        setPrestadorField('nome_empresa', updatedUser.nome_empresa || null);
        setPrestadorField('cnpj', updatedUser.cnpj || null);
        setPrestadorField('rua', updatedUser.rua || null);
        setPrestadorField('numero', updatedUser.numero || null);
        setPrestadorField('bairro', updatedUser.bairro || null);
        setPrestadorField('cidade', updatedUser.cidade || null);
        setPrestadorField('estado', updatedUser.estado || null);
        setPrestadorField('cep', updatedUser.cep || null);
        setPrestadorField('categoria_id', categoriaId);
        setPrestadorField('categoria_nome', categoriaNome);
        setPrestadorField('ativo', true);

        for (const field of prestadorAllowedFields) {
          if (!hasOwn(prestadorPayload, field)) {
            continue;
          }

          if (field === 'servicos' || field === 'fotos_trabalhos') {
            setPrestadorField(field, JSON.stringify(Array.isArray(prestadorPayload[field]) ? prestadorPayload[field] : []));
            continue;
          }

          setPrestadorField(field, parseNullable(prestadorPayload[field]));
        }

        prestadorValues.push(prestador.id);
        await pool.query(`UPDATE prestadores SET ${prestadorUpdates.join(', ')} WHERE id = ?`, prestadorValues);

        const [updatedPrestadorRows] = await pool.query('SELECT * FROM prestadores WHERE id = ? LIMIT 1', [
          prestador.id,
        ]);
        prestador = updatedPrestadorRows[0] || null;
      }
    } else if (prestador) {
      const telefoneFallback = updatedUser.telefone || prestador.telefone;
      await pool.query(
        `UPDATE prestadores
         SET user_id = ?, user_email = ?, nome = ?, telefone = ?, ativo = FALSE
         WHERE id = ?`,
        [
          updatedUser.id,
          normalizeEmail(updatedUser.email),
          updatedUser.full_name || prestador.nome,
          telefoneFallback,
          prestador.id,
        ]
      );

      const [updatedPrestadorRows] = await pool.query('SELECT * FROM prestadores WHERE id = ? LIMIT 1', [
        prestador.id,
      ]);
      prestador = updatedPrestadorRows[0] || null;
    }

    return res.json({
      user: updatedUser,
      prestador: prestador ? serializeRow(prestador) : null,
    });
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
      await pool.query('UPDATE prestadores SET ativo = ? WHERE user_id = ? OR LOWER(TRIM(user_email)) = ?', [
        ativo,
        id,
        normalizeEmail(existing.email),
      ]);
    }

    const updatedUserRow = await getUserById(id);
    return res.json({ item: toPublicUser(updatedUserRow) });
  })
);

app.delete(
  '/api/users/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    const pool = getPool();

    if (id === req.currentUser.id) {
      return res.status(400).json({ message: 'Você não pode excluir sua própria conta.' });
    }

    const [existingRows] = await pool.query('SELECT id, tipo FROM users WHERE id = ? LIMIT 1', [id]);
    const existing = existingRows[0];

    if (!existing) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    if (existing.tipo === 'admin') {
      const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE tipo = 'admin'");
      if ((countRows[0]?.total ?? 0) <= 1) {
        return res.status(400).json({ message: 'Não é possível excluir o último administrador.' });
      }
    }

    // Remove perfil de prestador vinculado antes de deletar o usuário
    await pool.query('DELETE FROM prestadores WHERE user_id = ?', [id]);
    await pool.query('DELETE FROM users WHERE id = ?', [id]);

    return res.status(204).end();
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
    const allowedFilters = ['id', 'user_id', 'user_email', 'categoria_id', 'ativo', 'destaque'];
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
        } else if (key === 'user_email') {
          filters.push('LOWER(TRIM(user_email)) = ?');
          values.push(normalizeEmail(req.query[key]));
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
    const normalizedCurrentUserEmail = normalizeEmail(req.currentUser.email);
    const existingPrestador = await getPrestadorByOwner(
      pool,
      req.currentUser.id,
      normalizedCurrentUserEmail
    );

    if (existingPrestador) {
      const existingUserEmail = normalizeEmail(existingPrestador.user_email);

      if (
        existingPrestador.user_id !== req.currentUser.id ||
        existingUserEmail !== normalizedCurrentUserEmail
      ) {
        await pool.query('UPDATE prestadores SET user_id = ?, user_email = ? WHERE id = ?', [
          req.currentUser.id,
          normalizedCurrentUserEmail,
          existingPrestador.id,
        ]);

        const [updatedRows] = await pool.query('SELECT * FROM prestadores WHERE id = ? LIMIT 1', [
          existingPrestador.id,
        ]);
        return res.status(200).json({ item: serializeRow(updatedRows[0]) });
      }

      return res.status(200).json({ item: serializeRow(existingPrestador) });
    }

    const [categoriaRows] = await pool.query('SELECT nome FROM categorias WHERE id = ? LIMIT 1', [
      payload.categoria_id,
    ]);
    const categoriaNome = categoriaRows[0]?.nome || payload.categoria_nome || null;

    const fotosTrabalhos = Array.isArray(payload.fotos_trabalhos)
      ? JSON.stringify(payload.fotos_trabalhos)
      : JSON.stringify([]);
    const servicos = Array.isArray(payload.servicos) ? JSON.stringify(payload.servicos) : JSON.stringify([]);
    const normalizedDataNascimento = hasOwn(payload, 'data_nascimento')
      ? normalizeDateOnly(payload.data_nascimento)
      : null;

    if (normalizedDataNascimento === undefined) {
      return res.status(400).json({ message: 'Data de nascimento inválida.' });
    }

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
        normalizedCurrentUserEmail,
        payload.nome,
        payload.cpf || null,
        normalizedDataNascimento,
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

    const currentUserEmail = normalizeEmail(req.currentUser.email);
    const existingUserEmail = normalizeEmail(existing.user_email);
    const isOwnerById = Boolean(existing.user_id) && req.currentUser.id === existing.user_id;
    const isOwnerByEmail =
      Boolean(currentUserEmail) && Boolean(existingUserEmail) && currentUserEmail === existingUserEmail;
    const isOwner = isOwnerById || isOwnerByEmail;
    const isAdmin = req.currentUser.tipo === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Sem permissão para atualizar este prestador.' });
    }

    if (
      isOwner &&
      Boolean(currentUserEmail) &&
      (existing.user_id !== req.currentUser.id || existingUserEmail !== currentUserEmail)
    ) {
      await pool.query('UPDATE prestadores SET user_id = ?, user_email = ? WHERE id = ?', [
        req.currentUser.id,
        currentUserEmail,
        id,
      ]);

      existing.user_id = req.currentUser.id;
      existing.user_email = currentUserEmail;
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

        if (field === 'data_nascimento') {
          const normalizedDate = normalizeDateOnly(payload[field]);
          if (normalizedDate === undefined) {
            return res.status(400).json({ message: 'Data de nascimento inválida.' });
          }
          updates.push('data_nascimento = ?');
          values.push(normalizedDate);
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
        await pool.query('UPDATE users SET ativo = ? WHERE id = ? OR LOWER(TRIM(email)) = ?', [
          ativo,
          existing.user_id,
          normalizeEmail(existing.user_email),
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
      const userEmail = normalizeEmail(req.currentUser.email);

      if (req.query.cliente_email && normalizeEmail(req.query.cliente_email) !== userEmail) {
        return res.status(403).json({ message: 'Sem permissão para esta consulta.' });
      }

      if (req.query.prestador_email && normalizeEmail(req.query.prestador_email) !== userEmail) {
        return res.status(403).json({ message: 'Sem permissão para esta consulta.' });
      }

      if (!req.query.cliente_email && !req.query.prestador_email) {
        filters.push('(LOWER(TRIM(cliente_email)) = ? OR LOWER(TRIM(prestador_email)) = ?)');
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

// ─── Atividades (backlog dev/cliente) ────────────────────────────────────────
app.use('/api/atividades', requireAuth, requireAdmin, atividadesRouter);

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
  await initAtividadesTable();
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
