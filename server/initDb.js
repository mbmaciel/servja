import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { getPool } from './db.js';

const createTablesSql = [
  `CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    avatar TEXT NULL,
    tipo ENUM('cliente', 'prestador', 'admin') NOT NULL DEFAULT 'cliente',
    telefone VARCHAR(30) NULL,
    cpf VARCHAR(20) NULL,
    cnpj VARCHAR(20) NULL,
    nome_empresa VARCHAR(150) NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    data_nascimento DATE NULL,
    rua VARCHAR(150) NULL,
    numero VARCHAR(20) NULL,
    complemento VARCHAR(150) NULL,
    bairro VARCHAR(120) NULL,
    cidade VARCHAR(120) NULL,
    estado VARCHAR(2) NULL,
    cep VARCHAR(12) NULL,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS categorias (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    nome VARCHAR(120) NOT NULL,
    icone VARCHAR(80) NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS prestadores (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    user_id CHAR(36) NULL,
    user_email VARCHAR(191) NULL,
    nome VARCHAR(150) NOT NULL,
    cpf VARCHAR(20) NULL,
    data_nascimento DATE NULL,
    telefone VARCHAR(30) NOT NULL,
    nome_empresa VARCHAR(150) NULL,
    cnpj VARCHAR(20) NULL,
    tipo_empresa ENUM('MEI', 'LTDA', 'Autônomo', 'Outro') NULL,
    categoria_id CHAR(36) NULL,
    categoria_nome VARCHAR(120) NULL,
    descricao TEXT NULL,
    servicos JSON NULL,
    valor_hora DECIMAL(10, 2) NULL,
    preco_base DECIMAL(10, 2) NULL,
    tempo_medio_atendimento VARCHAR(80) NULL,
    dias_disponiveis VARCHAR(120) NULL,
    horarios_disponiveis VARCHAR(120) NULL,
    rua VARCHAR(150) NULL,
    numero VARCHAR(20) NULL,
    bairro VARCHAR(120) NULL,
    cidade VARCHAR(120) NULL,
    estado VARCHAR(2) NULL,
    cep VARCHAR(12) NULL,
    raio_atendimento DECIMAL(8, 2) NULL,
    foto TEXT NULL,
    foto_facial TEXT NULL,
    foto_documento TEXT NULL,
    logo_empresa TEXT NULL,
    fotos_trabalhos JSON NULL,
    avaliacao DECIMAL(3, 2) NOT NULL DEFAULT 5.00,
    destaque BOOLEAN NOT NULL DEFAULT FALSE,
    status_aprovacao ENUM('pendente', 'aprovado', 'reprovado') NOT NULL DEFAULT 'pendente',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    latitude DECIMAL(10, 7) NULL,
    longitude DECIMAL(10, 7) NULL,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_prestadores_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_prestadores_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    INDEX idx_prestadores_ativo (ativo),
    INDEX idx_prestadores_user_email (user_email),
    INDEX idx_prestadores_categoria_id (categoria_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS solicitacoes (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    cliente_id CHAR(36) NULL,
    cliente_email VARCHAR(191) NOT NULL,
    cliente_nome VARCHAR(150) NULL,
    prestador_id CHAR(36) NOT NULL,
    prestador_email VARCHAR(191) NULL,
    prestador_nome VARCHAR(150) NULL,
    categoria_nome VARCHAR(120) NULL,
    descricao TEXT NOT NULL,
    preco_proposto DECIMAL(10, 2) NULL,
    preco_acordado DECIMAL(10, 2) NULL,
    status ENUM('aberto', 'aceito', 'concluido', 'cancelado') NOT NULL DEFAULT 'aberto',
    resposta_prestador TEXT NULL,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_solicitacoes_cliente FOREIGN KEY (cliente_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_solicitacoes_prestador FOREIGN KEY (prestador_id) REFERENCES prestadores(id) ON DELETE CASCADE,
    INDEX idx_solicitacoes_cliente_email (cliente_email),
    INDEX idx_solicitacoes_prestador_email (prestador_email),
    INDEX idx_solicitacoes_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

const defaultCategories = [
  { nome: 'Limpeza', icone: 'Sparkles' },
  { nome: 'Elétrica', icone: 'Zap' },
  { nome: 'Hidráulica', icone: 'Droplets' },
  { nome: 'Pintura', icone: 'PaintBucket' },
  { nome: 'Jardinagem', icone: 'Flower' },
  { nome: 'Fretes', icone: 'Package' },
];

const defaultUsers = [
  {
    full_name: 'Administrador ServiJá',
    email: 'admin@servija.local',
    password: 'admin123',
    tipo: 'admin',
    cidade: 'São Paulo',
    estado: 'SP',
  },
  {
    full_name: 'Cliente Demo',
    email: 'cliente@servija.local',
    password: 'cliente123',
    tipo: 'cliente',
    cidade: 'São Paulo',
    estado: 'SP',
  },
  {
    full_name: 'Prestador Demo',
    email: 'prestador@servija.local',
    password: 'prestador123',
    tipo: 'prestador',
    telefone: '(11) 99999-0000',
    cidade: 'São Paulo',
    estado: 'SP',
  },
];

export const initializeDatabase = async () => {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: true,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${config.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
    );
    await connection.query(`USE \`${config.db.database}\``);

    for (const sql of createTablesSql) {
      await connection.query(sql);
    }

    try {
      await connection.query('ALTER TABLE users ADD COLUMN cnpj VARCHAR(20) NULL AFTER cpf');
    } catch (error) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    try {
      await connection.query('ALTER TABLE users ADD COLUMN nome_empresa VARCHAR(150) NULL AFTER cnpj');
    } catch (error) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    try {
      await connection.query('ALTER TABLE users ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE AFTER nome_empresa');
    } catch (error) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }

    try {
      await connection.query('ALTER TABLE prestadores ADD COLUMN servicos JSON NULL AFTER descricao');
    } catch (error) {
      if (error?.code !== 'ER_DUP_FIELDNAME') {
        throw error;
      }
    }
  } finally {
    await connection.end();
  }

  await seedDatabase();
};

const seedDatabase = async () => {
  const pool = getPool();

  for (const user of defaultUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    await pool.query(
      `INSERT INTO users (
        full_name, email, password_hash, tipo, telefone, cidade, estado
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        full_name = VALUES(full_name),
        password_hash = VALUES(password_hash),
        tipo = VALUES(tipo),
        telefone = COALESCE(VALUES(telefone), telefone),
        cidade = COALESCE(VALUES(cidade), cidade),
        estado = COALESCE(VALUES(estado), estado)`,
      [
        user.full_name,
        user.email,
        passwordHash,
        user.tipo,
        user.telefone || null,
        user.cidade || null,
        user.estado || null,
      ]
    );
  }

  const [categoryCountRows] = await pool.query('SELECT COUNT(*) AS total FROM categorias');
  const categoryCount = categoryCountRows[0]?.total ?? 0;

  if (categoryCount === 0) {
    for (const category of defaultCategories) {
      await pool.query(
        'INSERT INTO categorias (nome, icone, ativo) VALUES (?, ?, TRUE)',
        [category.nome, category.icone]
      );
    }
  }

  const [prestadorUserRows] = await pool.query(
    'SELECT id, email, full_name, telefone, cidade FROM users WHERE email = ?',
    ['prestador@servija.local']
  );
  const prestadorUser = prestadorUserRows[0];

  const [categoryRows] = await pool.query(
    'SELECT id, nome FROM categorias WHERE ativo = TRUE ORDER BY created_date ASC LIMIT 1'
  );
  const primaryCategory = categoryRows[0];

  if (prestadorUser && primaryCategory) {
    const [existingPrestadorRows] = await pool.query(
      'SELECT id FROM prestadores WHERE user_email = ? LIMIT 1',
      [prestadorUser.email]
    );

    if (existingPrestadorRows.length === 0) {
      await pool.query(
        `INSERT INTO prestadores (
          user_id,
          user_email,
          nome,
          telefone,
          categoria_id,
          categoria_nome,
          descricao,
          preco_base,
          cidade,
          ativo,
          destaque,
          status_aprovacao,
          latitude,
          longitude
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, 'aprovado', ?, ?)`,
        [
          prestadorUser.id,
          prestadorUser.email,
          prestadorUser.full_name,
          prestadorUser.telefone || '(11) 99999-0000',
          primaryCategory.id,
          primaryCategory.nome,
          'Prestador de serviços demo para ambiente local.',
          120,
          prestadorUser.cidade || 'São Paulo',
          -23.55052,
          -46.63331,
        ]
      );
    }
  }
};
