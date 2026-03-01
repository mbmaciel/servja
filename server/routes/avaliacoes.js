import { randomUUID } from 'node:crypto';
import { createReadStream, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import multer from 'multer';
import { getPool } from '../db.js';

export const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'avaliacoes');
mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Apenas imagens são permitidas.'));
    }
    cb(null, true);
  },
});

// ─── Inicialização da tabela ──────────────────────────────────────────────────

let tableReady = false;

export const initAvaliacoesTable = async () => {
  if (tableReady) return;
  const pool = getPool();

  await pool.query(`
    CREATE TABLE IF NOT EXISTS avaliacoes (
      id              CHAR(36)     PRIMARY KEY,
      solicitacao_id  CHAR(36)     NOT NULL UNIQUE,
      prestador_id    CHAR(36)     NOT NULL,
      cliente_id      CHAR(36),
      cliente_nome    VARCHAR(150),
      estrelas        TINYINT      NOT NULL,
      comentario      TEXT,
      fotos           JSON,
      created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE CASCADE,
      INDEX idx_prestador (prestador_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  tableReady = true;
};

// ─── GET /api/avaliacoes/foto/:filename ───────────────────────────────────────
// Deve vir antes das rotas /:id

router.get('/foto/:filename', (req, res) => {
  const filePath = path.join(UPLOADS_DIR, req.params.filename);
  createReadStream(filePath)
    .on('error', () => res.status(404).json({ message: 'Arquivo não encontrado.' }))
    .pipe(res);
});

// ─── GET /api/avaliacoes/solicitacao/:sid ─────────────────────────────────────
// Deve vir antes das rotas /:id

router.get('/solicitacao/:sid', async (req, res, next) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM avaliacoes WHERE solicitacao_id = ? LIMIT 1',
      [req.params.sid]
    );
    res.json({ item: rows[0] ?? null });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/avaliacoes ──────────────────────────────────────────────────────

router.get('/', async (req, res, next) => {
  try {
    const pool = getPool();
    const { prestador_id } = req.query;

    if (!prestador_id) {
      return res.status(400).json({ message: 'Parâmetro prestador_id é obrigatório.' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM avaliacoes WHERE prestador_id = ? ORDER BY created_at DESC',
      [prestador_id]
    );

    res.json({ items: rows });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/avaliacoes ─────────────────────────────────────────────────────

router.post('/', async (req, res, next) => {
  try {
    // Requer autenticação
    if (!req.currentUser) {
      return res.status(401).json({ message: 'Não autenticado.' });
    }

    const pool = getPool();
    const { solicitacao_id, estrelas, comentario } = req.body ?? {};

    if (!solicitacao_id) {
      return res.status(400).json({ message: 'solicitacao_id é obrigatório.' });
    }

    const numEstrelas = Number(estrelas);
    if (!Number.isInteger(numEstrelas) || numEstrelas < 1 || numEstrelas > 5) {
      return res.status(400).json({ message: 'Estrelas deve ser um número inteiro entre 1 e 5.' });
    }

    // Verifica se a solicitação existe e está concluída
    const [solRows] = await pool.query(
      'SELECT * FROM solicitacoes WHERE id = ? LIMIT 1',
      [solicitacao_id]
    );
    const sol = solRows[0];

    if (!sol) {
      return res.status(404).json({ message: 'Solicitação não encontrada.' });
    }
    if (sol.status !== 'concluido') {
      return res.status(400).json({ message: 'Só é possível avaliar serviços concluídos.' });
    }

    // Verifica se quem está avaliando é o cliente da solicitação
    const emailNorm = (s) => (s || '').trim().toLowerCase();
    if (emailNorm(req.currentUser.email) !== emailNorm(sol.cliente_email)) {
      return res.status(403).json({ message: 'Apenas o cliente pode avaliar esta solicitação.' });
    }

    // Verifica se já existe avaliação
    const [existing] = await pool.query(
      'SELECT id FROM avaliacoes WHERE solicitacao_id = ? LIMIT 1',
      [solicitacao_id]
    );
    if (existing[0]) {
      return res.status(409).json({ message: 'Esta solicitação já foi avaliada.' });
    }

    const id = randomUUID();
    const now = new Date();

    await pool.query(
      `INSERT INTO avaliacoes
         (id, solicitacao_id, prestador_id, cliente_id, cliente_nome, estrelas, comentario, fotos, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        solicitacao_id,
        sol.prestador_id,
        req.currentUser.id,
        req.currentUser.full_name || req.currentUser.email,
        numEstrelas,
        comentario?.trim() || null,
        JSON.stringify([]),
        now,
      ]
    );

    // Recalcular média do prestador
    await pool.query(
      `UPDATE prestadores
       SET avaliacao = (SELECT AVG(estrelas) FROM avaliacoes WHERE prestador_id = ?)
       WHERE id = ?`,
      [sol.prestador_id, sol.prestador_id]
    );

    const [rows] = await pool.query('SELECT * FROM avaliacoes WHERE id = ? LIMIT 1', [id]);
    res.status(201).json({ item: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/avaliacoes/:id/fotos ──────────────────────────────────────────

router.post('/:id/fotos', (req, res, next) => {
  if (!req.currentUser) {
    return res.status(401).json({ message: 'Não autenticado.' });
  }

  upload.single('foto')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ message: 'Arquivo muito grande. Limite: 10 MB.' });
      }
      return next(err);
    }

    try {
      const pool = getPool();
      const { id } = req.params;

      const [rows] = await pool.query('SELECT * FROM avaliacoes WHERE id = ? LIMIT 1', [id]);
      const avaliacao = rows[0];

      if (!avaliacao) {
        return res.status(404).json({ message: 'Avaliação não encontrada.' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
      }

      const fotos = Array.isArray(avaliacao.fotos) ? avaliacao.fotos : [];
      const url = `/api/avaliacoes/foto/${req.file.filename}`;
      fotos.push(url);

      await pool.query('UPDATE avaliacoes SET fotos = ? WHERE id = ?', [
        JSON.stringify(fotos),
        id,
      ]);

      res.status(201).json({ url });
    } catch (e) {
      next(e);
    }
  });
});
