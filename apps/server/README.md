# FIF 2026 API

Backend for the **FIKIRI Innovation Festival (FIF) 2026** recruitment platform. It exposes the public committee and volunteer application flows, the committee job catalog, and a cookie-authenticated staff API for reviewing applications, changing statuses, viewing statistics, exporting CSV files, and reading notifications.

## Technology

- Node.js 24
- NestJS 11 and Express
- TypeScript 5.9
- Prisma 6 and PostgreSQL
- Better Auth 1.7
- Swagger/OpenAPI and Scalar
- pnpm

## Requirements

- Node.js 24 (the version used by the Docker image)
- pnpm via Corepack
- PostgreSQL, locally or through Docker
- Docker with Compose, if using the container workflow

This app is part of the `fif` pnpm/Turborepo monorepo — see the [root README](../../README.md) for install, dev, and Docker commands that cover both apps.

## Configuration

Copy the checked-in example, then replace its development credentials:

```bash
cp apps/server/.env.example apps/server/.env
```

For the production Compose file, `UPLOAD_DIR=/app/uploads` is set so uploads are written to the persistent `uploads_data` volume.

## Run locally

From the repo root, install dependencies once for the whole workspace:

```bash
pnpm install --frozen-lockfile
```

Make sure the PostgreSQL server referenced by `DATABASE_URL` is running, then prepare the database:

```bash
pnpm --filter server prisma:migrate:deploy
pnpm --filter server prisma:seed
```

Start the API alone with `pnpm dev:server` (from the root), or `pnpm dev` to run both apps.

## Run with Docker Compose

From the repo root:

```bash
pnpm docker:dev
```

This starts Postgres, Adminer, and both apps. Apply migrations and seed the catalog inside the running container:

```bash
docker compose -f compose.dev.yml exec server pnpm prisma:migrate:deploy
docker compose -f compose.dev.yml exec server pnpm prisma:seed
```

Postgres uses a named volume (`postgres_data`). `docker compose stop` and `docker compose down` keep that data. Only `docker compose down -v` wipes it.

Local `pnpm start:dev` uses `DATABASE_URL` on `localhost:${DB_PORT}` (5434 by default) so it does not collide with other Postgres instances on 5432. Inside Compose, the API talks to the `db` service.

## Architecture notes

- [Documentation index](docs/README.md)
- [ADR-0001: platform architecture, hiring domain, and session auth](docs/adr/0001-platform-architecture.md)
- [ADR-0002: notifications, email, and file storage](docs/adr/0002-notifications-email-files.md)
- [Infrastructure request](docs/undp-infra-request.md)
