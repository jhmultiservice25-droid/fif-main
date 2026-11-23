# FIKIRI Innovation Festival 2026

Angular web application for FIF 2026, the FIKIRI Innovation Festival taking place in Kinshasa on 25–27 November 2026.

The festival connects Congolese solutions and digital talent with the organizations that can buy, finance, recruit, and deploy them.

## Tech stack

- Angular 22.1 with standalone components and signals
- Angular SSR 22.1 with Express 5
- Angular Material and Angular CDK
- Tailwind CSS 4 through PostCSS
- NgRx Signal Store for managed application state
- TypeScript 6 in strict mode
- pnpm 11 and Node.js 24
- ESLint 10, Prettier 3, Husky, and Commitlint

## Prerequisites

- Node.js 24
- pnpm 11, preferably enabled through Corepack
- The FIF API running locally on `http://localhost:8000` for API-backed features

This app is part of the `fif` pnpm/Turborepo monorepo — see the [root README](../../README.md) for install and Docker commands that cover both apps.

## Getting started

From the repo root, install the locked dependencies once for the whole workspace:

```bash
pnpm install --frozen-lockfile
```

Start the Angular development server with `pnpm dev:web` (from the root), or from this directory:

```bash
pnpm dev
```

Open [http://localhost:4200](http://localhost:4200).

## Environment configuration

API base URLs are defined in Angular environment files:

| Build configuration | File                                          | API URL                 |
| ------------------- | --------------------------------------------- | ----------------------- |
| Development         | `src/environments/environment.development.ts` | `http://localhost:8000` |
| Production          | `src/environments/environment.ts`             | `https://api.fif.co`    |

The HTTP interceptor prefixes Angular `HttpClient` requests with the configured API URL and sends credentials with each request. The application does not currently use a runtime `.env` override for the API URL.

## Available commands

| Command             | Description                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`          | Run the development server on port 4200 (alias: `pnpm start`)          |
| `pnpm build`        | Create the production browser and SSR bundles in `dist/fif-web`         |
| `pnpm watch`        | Rebuild continuously with the development configuration                 |
| `pnpm start:prod`   | Run a previously built SSR bundle; defaults to port 4000 or uses `PORT` |
| `pnpm lint`         | Lint TypeScript and Angular templates                                   |
| `pnpm typecheck`    | Type-check without emitting output                                      |
| `pnpm ng -- <args>` | Pass arguments to the Angular CLI                                       |

## Project structure

Feature code lives under `src/app/domains` and follows these conventions:

- `data-access`: NgRx Signal Stores for stateful write operations (`POST`, `PATCH`, and `PUT`)
- `features`: routed screens and feature displays
- `interfaces`: shared interfaces prefixed with `I` and exposed through barrel exports
- `ui`: presentational elements without direct store interaction

API reads that do not require local state use Angular's `httpResource` API. Components are standalone, and routed features are lazy-loaded.

## Routing and rendering

The root route lazy-loads the public website domain and its landing feature. Angular SSR renders every route on the server, and browser hydration is enabled with `provideClientHydration()`.

The production server serves static browser assets with a one-year cache and sends all other requests to Angular's server engine. It listens on `PORT` when provided and otherwise uses port `4000`.

## Styling, icons, and theming

Global styles enter through `src/styles/styles.css`, which loads Tailwind, Angular CDK overlay styles, the Material Azure Blue base theme, project typography, and component overrides.

The application uses bundled Geist fonts. Lucide SVG icons are registered centrally, and the theme service generates primary and error tonal palettes as CSS variables.

## Docker

From the repo root, `pnpm docker:dev` / `pnpm docker:prod` start both apps together. See the [root README](../../README.md) for details.

## Code quality

- TypeScript and Angular template strictness are enabled.
- ESLint checks TypeScript, Angular templates, accessibility, and unused imports.
- Prettier formats Angular templates and sorts Tailwind classes.
- The repo-root `.husky/pre-commit` hook runs `pnpm --filter web lint`.
- The repo-root `.husky/commit-msg` hook validates Conventional Commit messages.
