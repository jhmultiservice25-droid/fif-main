FROM node:24-alpine AS base

RUN corepack enable
ENV CI=true
WORKDIR /app

FROM base AS pruner

COPY . .
RUN pnpm dlx turbo prune web --docker

FROM base AS dependencies

COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile

FROM dependencies AS development

COPY --from=pruner /app/out/full/ .
WORKDIR /app/apps/web

FROM dependencies AS build

COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=web

FROM build AS production

ENV NODE_ENV=production
WORKDIR /app/apps/web
