# ServiJá Local (MySQL)

Aplicação React + Vite com backend próprio em Node/Express e persistência em MySQL, sem dependência do Base44.

## Requisitos

- Node.js 18+
- MySQL local (testado com Homebrew)

## Configuração

1. Instale dependências:

```bash
npm install
```

2. Configure variáveis em `.env.local` para desenvolvimento local:

```env
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=servija
JWT_SECRET=servija-local-jwt-secret-change-me
JWT_EXPIRES_IN=7d
```

Em produção, defina essas variáveis no ambiente do servidor (não em `.env.local`).

3. Garanta que o MySQL esteja ativo.

## Rodar em desenvolvimento

Terminal 1 (API):

```bash
npm run server
```

Terminal 2 (frontend):

```bash
npm run dev
```

O Vite faz proxy de `/api` para `http://localhost:3001`.

## Rodar aplicação no servidor (produção local)

```bash
npm run start
```

Esse comando gera o build (`dist/`) e sobe o servidor Express na porta `3001`, servindo frontend + API no mesmo processo.

## Banco de dados

Na inicialização do backend:

- cria o banco `servija` (se não existir)
- cria as tabelas: `users`, `categorias`, `prestadores`, `solicitacoes`
- aplica seed inicial de usuários e categorias

Usuários seed:

- `admin@servija.local` / `admin123`
- `prestador@servija.local` / `prestador123`
- `cliente@servija.local` / `cliente123`

## Verificação recomendada

```bash
npm run lint
npm run typecheck
npm run build
```
