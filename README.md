# ServiJa Local

Aplicacao React + Vite com backend Node/Express e persistencia em MySQL.

## Fluxo de desenvolvimento

Desenvolver local -> Testar local -> Commit/Push GitHub -> Deploy VPS

1. Desenvolvimento local

```bash
npm run dev
# ou
docker compose up
```

2. Testar localmente antes de enviar

```bash
npm run build
```

3. Commit e push

```bash
git add -A
git commit -m "feat: descricao"
git push origin master
```

4. Deploy na VPS

```bash
bash deploy.sh
```

`deploy.sh` deve conectar por SSH, atualizar o codigo no servidor, gerar build e reiniciar apenas o processo do app no PM2.

## Arquivos sensiveis

Estes arquivos nao devem ser versionados:

- `.env`
- `.env.local`
- `ecosystem.config.js`
- `*.sql`
- `.claude/`

## Configuracao local

1. Instale dependencias:

```bash
npm install
```

2. Copie `.env.local.example` para `.env.local`.

3. Ajuste as variaveis locais conforme seu ambiente.

Exemplo para desenvolvimento com Docker Compose:

```env
PORT=3001
NODE_ENV=development
DB_HOST=mysql
DB_PORT=3306
DB_USER=servija
DB_PASSWORD=servija_local_dev_password
DB_NAME=servija
JWT_SECRET=change-me-local-dev-secret
JWT_EXPIRES_IN=7d
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
```

## Banco de dados

Na inicializacao do backend:

- cria o banco `servija` se nao existir
- cria as tabelas `users`, `categorias`, `prestadores` e `solicitacoes`
- aplica seed inicial de usuarios e categorias

Usuarios seed:

- `admin@servija.local` / `admin123`
- `prestador@servija.local` / `prestador123`
- `cliente@servija.local` / `cliente123`

## Verificacao recomendada

```bash
npm run lint
npm run typecheck
npm run build
```
