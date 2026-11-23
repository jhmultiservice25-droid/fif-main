FROM node:24-alpine AS base

RUN apk add --no-cache openssl libc6-compat
RUN corepack enable
ENV CI=true
WORKDIR /app

FROM base AS pruner

COPY . .
RUN pnpm dlx turbo prune server --docker

FROM base AS dependencies

COPY --from=pruner /app/out/json/ .
RUN pnpm install --frozen-lockfile
COPY --from=pruner /app/out/full/apps/server/prisma ./apps/server/prisma
RUN pnpm --filter=server prisma:generate

FROM dependencies AS development

COPY --from=pruner /app/out/full/ .
WORKDIR /app/apps/server
CMD ["pnpm", "start:dev"]

FROM dependencies AS build

COPY --from=pruner /app/out/full/ .
RUN pnpm turbo run build --filter=server

FROM build AS production

ENV NODE_ENV=production
WORKDIR /app/apps/server
CMD ["pnpm", "start:prod"]
