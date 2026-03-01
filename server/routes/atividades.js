import { randomUUID } from 'node:crypto';
import { createReadStream, mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import multer from 'multer';
import { getPool } from '../db.js';

export const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'atividades');
mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// ─── Inicialização das tabelas ────────────────────────────────────────────────

let tableReady = false;

export const initAtividadesTable = async () => {
  if (tableReady) return;
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS atividades (
      id            VARCHAR(36)  PRIMARY KEY,
      titulo        VARCHAR(255) NOT NULL,
      descricao     TEXT,
      resolucao     TEXT,
      modulo        VARCHAR(100) NOT NULL DEFAULT 'outros',
      prioridade    ENUM('baixa','media','alta','urgente') NOT NULL DEFAULT 'media',
      status        ENUM('pendente','em_desenvolvimento','testando','concluido','cancelado','atrasada')
                    NOT NULL DEFAULT 'pendente',
      criado_por       VARCHAR(36),
      criado_por_nome  VARCHAR(255),
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
                    ON UPDATE CURRENT_TIMESTAMP,
      completed_at  DATETIME NULL,
      INDEX idx_modulo    (modulo),
      INDEX idx_status    (status),
      INDEX idx_prioridade (prioridade),
      INDEX idx_created   (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Migration: add resolucao column if missing
  try {
    await pool.query('ALTER TABLE atividades ADD COLUMN resolucao TEXT NULL AFTER descricao');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }

  // Migration: add concluido_por_nome column if missing
  try {
    await pool.query('ALTER TABLE atividades ADD COLUMN concluido_por_nome VARCHAR(255) NULL AFTER criado_por_nome');
  } catch (err) {
    if (err.code !== 'ER_DUP_FIELDNAME') throw err;
  }

  // Migration: add 'atrasada' to status ENUM if missing
  try {
    await pool.query(
      `ALTER TABLE atividades MODIFY COLUMN status
       ENUM('pendente','em_desenvolvimento','testando','concluido','cancelado','atrasada')
       NOT NULL DEFAULT 'pendente'`
    );
  } catch {
    // Ignore — ENUM already up to date
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS atividades_anexos (
      id            VARCHAR(36)  PRIMARY KEY,
      atividade_id  VARCHAR(36)  NOT NULL,
      nome_original VARCHAR(255) NOT NULL,
      nome_arquivo  VARCHAR(100) NOT NULL,
      mime_type     VARCHAR(100),
      tamanho       INT,
      criado_por    VARCHAR(36),
      created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (atividade_id) REFERENCES atividades(id) ON DELETE CASCADE,
      INDEX idx_atividade (atividade_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  tableReady = true;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ALLOWED_SORT = ['titulo', 'modulo', 'prioridade', 'status', 'created_at', 'updated_at'];

const buildSort = (raw) => {
  if (!raw || typeof raw !== 'string') return 'ORDER BY created_at DESC';
  const desc = raw.startsWith('-');
  const field = desc ? raw.slice(1) : raw;
  const safe = ALLOWED_SORT.includes(field) ? field : 'created_at';
  return `ORDER BY ${safe} ${desc ? 'DESC' : 'ASC'}`;
};

const serialize = (row) => ({
  ...row,
  created_at:   row.created_at   ? new Date(row.created_at).toISOString()   : null,
  updated_at:   row.updated_at   ? new Date(row.updated_at).toISOString()   : null,
  completed_at: row.completed_at ? new Date(row.completed_at).toISOString() : null,
});

// ─── GET /api/atividades ──────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const { modulo, status, prioridade, q, sort } = req.query;

    const conditions = [];
    const params = [];

    if (modulo)     { conditions.push('a.modulo = ?');     params.push(modulo); }
    if (status)     { conditions.push('a.status = ?');     params.push(status); }
    if (prioridade) { conditions.push('a.prioridade = ?'); params.push(prioridade); }
    if (q) {
      conditions.push('(a.titulo LIKE ? OR a.descricao LIKE ?)');
      params.push(`%${q}%`, `%${q}%`);
    }

    const where   = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = buildSort(sort).replace('ORDER BY ', 'ORDER BY a.');

    const [rows] = await pool.query(
      `SELECT a.*,
              (SELECT COUNT(*) FROM atividades_anexos WHERE atividade_id = a.id) AS anexos_count
       FROM atividades a ${where} ${orderBy}`,
      params
    );

    res.json({ items: rows.map(serialize) });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/atividades ─────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const { titulo, descricao, modulo, prioridade } = req.body ?? {};

    if (!titulo?.trim()) {
      return res.status(400).json({ message: 'Título é obrigatório.' });
    }

    const VALID_MODULOS    = [
      'autenticacao', 'prestadores', 'solicitacoes', 'categorias', 'busca',
      'pagamentos', 'perfil', 'dashboard', 'admin', 'notificacoes', 'api', 'outros',
    ];
    const VALID_PRIORIDADES = ['baixa', 'media', 'alta', 'urgente'];

    const safeModulo     = VALID_MODULOS.includes(modulo)         ? modulo      : 'outros';
    const safePrioridade = VALID_PRIORIDADES.includes(prioridade) ? prioridade  : 'media';

    const id  = randomUUID();
    const now = new Date();

    await pool.query(
      `INSERT INTO atividades
        (id, titulo, descricao, modulo, prioridade, status, criado_por, criado_por_nome, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'pendente', ?, ?, ?, ?)`,
      [
        id,
        titulo.trim(),
        descricao?.trim() || null,
        safeModulo,
        safePrioridade,
        req.currentUser.id,
        req.currentUser.full_name || req.currentUser.email,
        now,
        now,
      ]
    );

    const [rows] = await pool.query(
      `SELECT a.*, 0 AS anexos_count FROM atividades a WHERE a.id = ? LIMIT 1`, [id]
    );
    res.status(201).json({ item: serialize(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/atividades/file/:aid (download) — must be before /:id routes ───

router.get('/file/:aid', async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM atividades_anexos WHERE id = ? LIMIT 1', [req.params.aid]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Arquivo não encontrado.' });

    const filePath = path.join(UPLOADS_DIR, rows[0].nome_arquivo);
    res.setHeader('Content-Type', rows[0].mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(rows[0].nome_original)}"`);
    createReadStream(filePath).on('error', () => {
      res.status(404).json({ message: 'Arquivo físico não encontrado.' });
    }).pipe(res);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/atividades/file/:aid — must be before DELETE /:id ───────────

router.delete('/file/:aid', async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM atividades_anexos WHERE id = ? LIMIT 1', [req.params.aid]
    );
    if (!rows[0]) return res.status(404).json({ message: 'Arquivo não encontrado.' });

    await unlink(path.join(UPLOADS_DIR, rows[0].nome_arquivo)).catch(() => {});
    await pool.query('DELETE FROM atividades_anexos WHERE id = ?', [req.params.aid]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/atividades/:id/anexos ──────────────────────────────────────────

router.get('/:id/anexos', async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM atividades_anexos WHERE atividade_id = ? ORDER BY created_at ASC',
      [req.params.id]
    );
    res.json({
      items: rows.map((r) => ({
        ...r,
        created_at: r.created_at ? new Date(r.created_at).toISOString() : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/atividades/:id/anexos ─────────────────────────────────────────

router.post('/:id/anexos', (req, res, next) => {
  upload.single('arquivo')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Arquivo muito grande. Limite: 10 MB.' });
      }
      return next(err);
    }

    try {
      const pool = getPool();
      const { id } = req.params;

      const [atividade] = await pool.query(
        'SELECT id FROM atividades WHERE id = ? LIMIT 1', [id]
      );
      if (!atividade[0]) {
        if (req.file) await unlink(req.file.path).catch(() => {});
        return res.status(404).json({ message: 'Atividade não encontrada.' });
      }

      if (!req.file) return res.status(400).json({ message: 'Nenhum arquivo enviado.' });

      const anexoId = randomUUID();
      const now     = new Date();

      await pool.query(
        `INSERT INTO atividades_anexos
          (id, atividade_id, nome_original, nome_arquivo, mime_type, tamanho, criado_por, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          anexoId,
          id,
          req.file.originalname,
          req.file.filename,
          req.file.mimetype,
          req.file.size,
          req.currentUser.id,
          now,
        ]
      );

      const [rows] = await pool.query(
        'SELECT * FROM atividades_anexos WHERE id = ?', [anexoId]
      );
      res.status(201).json({
        item: { ...rows[0], created_at: new Date(rows[0].created_at).toISOString() },
      });
    } catch (e) {
      next(e);
    }
  });
});

// ─── PATCH /api/atividades/:id ────────────────────────────────────────────────

router.patch('/:id', async (req, res, next) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT * FROM atividades WHERE id = ? LIMIT 1', [id]
    );
    if (!existing[0]) {
      return res.status(404).json({ message: 'Atividade não encontrada.' });
    }

    const payload        = req.body ?? {};
    const ALLOWED_FIELDS = ['titulo', 'descricao', 'resolucao', 'modulo', 'prioridade', 'status'];
    const updates = [];
    const values  = [];

    for (const field of ALLOWED_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(payload, field)) {
        updates.push(`${field} = ?`);
        values.push(payload[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo válido para atualizar.' });
    }

    if (payload.status === 'concluido' && existing[0].status !== 'concluido') {
      updates.push('completed_at = ?');
      values.push(new Date());
      updates.push('concluido_por_nome = ?');
      values.push(req.currentUser.full_name || req.currentUser.email);
    }

    if (payload.status && payload.status !== 'concluido' && existing[0].status === 'concluido') {
      updates.push('completed_at = NULL');
      updates.push('resolucao = NULL');
      updates.push('concluido_por_nome = NULL');
    }

    values.push(id);
    await pool.query(
      `UPDATE atividades SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [rows] = await pool.query(
      `SELECT a.*, (SELECT COUNT(*) FROM atividades_anexos WHERE atividade_id = a.id) AS anexos_count
       FROM atividades a WHERE a.id = ? LIMIT 1`,
      [id]
    );
    res.json({ item: serialize(rows[0]) });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/atividades/:id ───────────────────────────────────────────────

router.delete('/:id', async (req, res, next) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id FROM atividades WHERE id = ? LIMIT 1', [id]
    );
    if (!existing[0]) {
      return res.status(404).json({ message: 'Atividade não encontrada.' });
    }

    // Remove physical files before deleting record (CASCADE handles DB rows)
    const [anexos] = await pool.query(
      'SELECT nome_arquivo FROM atividades_anexos WHERE atividade_id = ?', [id]
    );
    await Promise.all(
      anexos.map((a) => unlink(path.join(UPLOADS_DIR, a.nome_arquivo)).catch(() => {}))
    );

    await pool.query('DELETE FROM atividades WHERE id = ?', [id]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
