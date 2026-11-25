# syntax=docker/dockerfile:1
# Node apps of the monorepo (api, worker). Node runs the TypeScript directly (no build step).
# Build: docker build -f docker/Dockerfile --build-arg APP=api -t consultorio/api .
# The same image also runs the one-shot migration (`pnpm db:migrate`: the prisma CLI is a dependency of @app/db).
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS install
ARG APP
WORKDIR /app
RUN npm install --global pnpm@12.21.0
COPY . .
# prisma generate (postinstall) reads this variable but never connects.
ENV MIGRATION_DATABASE_URL=postgres://build:build@localhost:5432/build
RUN pnpm install --frozen-lockfile --filter "@app/${APP}..." --filter "@app/db" \
  && pnpm store prune

FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5
ARG APP
ENV NODE_ENV=production
RUN npm install --global pnpm@12.21.0
WORKDIR /app
COPY --from=install --chown=node:node /app /app
USER node
WORKDIR /app/apps/${APP}
CMD ["node", "src/index.ts"]
