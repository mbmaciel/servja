# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains the app code.
- `src/pages/` holds route-level screens (`Home.jsx`, `Admin.jsx`, etc.); routes are wired through `src/pages.config.js` (auto-generated, edit only `mainPage`).
- `src/components/servija/` contains domain components; `src/components/ui/` contains generated Shadcn/Radix UI primitives.
- `src/lib/` and `src/api/` contain shared utilities, auth/query setup, and Base44 client integration.
- `src/hooks/` is for reusable hooks; `src/utils/` for utility helpers.
- `entities/` stores Base44 entity schemas (`Prestador`, `Categoria`, `Solicitacao`).

## Build, Test, and Development Commands
- `npm run dev`: start Vite dev server.
- `npm run build`: generate production bundle in `dist/`.
- `npm run preview`: serve the production build locally.
- `npm run lint`: run ESLint with project rules.
- `npm run lint:fix`: auto-fix lint issues when possible.
- `npm run typecheck`: run TypeScript checks via `jsconfig.json` (`checkJs` enabled).

## Coding Style & Naming Conventions
- Follow existing React + ES module patterns and keep imports ordered logically.
- Use `@/` alias for internal imports (configured in `jsconfig.json`).
- Component/page filenames use PascalCase (`PrestadorCard.jsx`); hooks use `useX` naming.
- Keep UI primitives in `src/components/ui/` unchanged unless updating generated components intentionally.
- Lint is strict on unused imports (`unused-imports/no-unused-imports`); remove dead code before PR.

## Testing Guidelines
- No automated test runner is currently configured in this repository.
- Minimum quality gate: run `npm run lint` and `npm run typecheck` before opening a PR.
- For behavior changes, include manual QA steps in PR description (route, action, expected result).
- If adding tests, prefer Vitest + React Testing Library with `*.test.jsx` colocated near target files.

## Commit & Pull Request Guidelines
- Git history is not available in this checkout, so use Conventional Commit style moving forward: `feat:`, `fix:`, `chore:`, `refactor:`.
- Keep commits focused and descriptive (one logical change per commit).
- PRs should include: summary, scope, validation commands run, linked issue (if any), and screenshots/GIFs for UI updates.

## Security & Configuration Tips
- Keep secrets in `.env.local`; never commit credentials.
- Required env vars: `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL`.
- Validate Base44 schema changes in `entities/` alongside related UI/API updates.
