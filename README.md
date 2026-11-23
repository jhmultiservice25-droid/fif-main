# FIF 2026

Platform for the **FIKIRI Innovation Festival 2026** (Kinshasa, 25–27 November 2026): committee and volunteer recruitment, plus a marketplace connecting organizations' needs with innovators' projects.

pnpm + Turborepo monorepo with two apps:

| App | Path | Stack | README |
|---|---|---|---|
| `server` | `apps/server` | NestJS 11, Prisma 6, PostgreSQL | [apps/server/README.md](apps/server/README.md) |
| `web` | `apps/web` | Angular 22, SSR | [apps/web/README.md](apps/web/README.md) |

## Requirements

- Node.js 24
- pnpm 11 (via Corepack)
- Docker with Compose, for the containerized workflow

## Setup

```bash
pnpm install --frozen-lockfile
cp apps/server/.env.example apps/server/.env
```

## Commands

Run from the repo root; each also has a `:server` / `:web` variant to target one app.

| Command | Description |
|---|---|
| `pnpm dev` | Run both apps in watch mode |
| `pnpm build` | Build both apps |
| `pnpm lint` | Lint both apps |
| `pnpm typecheck` | Type-check both apps |

Example: `pnpm dev:server`, `pnpm build:web`.

## Docker

```bash
pnpm docker:dev   # server + web + Postgres + Adminer, hot reload
pnpm docker:prod  # production images, detached
```

Both compose files live at the repo root (`compose.dev.yml`, `compose.prod.yml`) and build each app from `apps/server/Dockerfile` / `apps/web/Dockerfile`.

## Structure

```text
apps/
  server/   NestJS API (recruitment, auth, marketplace, admin)
  web/      Angular frontend (public site, org/innovator/admin spaces)
```