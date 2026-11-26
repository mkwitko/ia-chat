# syntax=docker/dockerfile:1
# Static panel (apps/web) and public site (apps/site), served by Caddy over HTTP behind the Cloudflare Tunnel.
FROM node:26-alpine@sha256:6bd9ab43c0ec0190ca7b2d193906cb8b7edf6e7f4afa43ddeccd6452710bffb5 AS build
WORKDIR /app
RUN npm install --global pnpm@12.21.0
COPY . .
ENV MIGRATION_DATABASE_URL=postgres://build:build@localhost:5432/build
# Public values baked into the bundles (only VITE_ and PUBLIC_ variables reach the browser).
ARG VITE_HELP_URL=
ARG VITE_SENTRY_DSN=
ARG VITE_RELEASE=
ARG PUBLIC_TURNSTILE_SITE_KEY=
ARG PUBLIC_API_URL=
ENV VITE_HELP_URL=$VITE_HELP_URL VITE_SENTRY_DSN=$VITE_SENTRY_DSN VITE_RELEASE=$VITE_RELEASE \
    PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY PUBLIC_API_URL=$PUBLIC_API_URL
RUN pnpm install --frozen-lockfile --filter @app/web --filter @app/site \
  && pnpm --filter @app/web build \
  && pnpm --filter @app/site exec astro sync \
  && pnpm --filter @app/site build

FROM caddy:2-alpine@sha256:003a97808e781aa9f7e75cc2f43d34d461099031faf5e20faefb9f61126836f0
COPY docker/edge/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /srv/web
COPY --from=build /app/apps/site/dist /srv/site
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q --spider http://127.0.0.1:2019/config/ || exit 1
