#!/bin/sh
# Production roles (RN-02), created once when the data directory is first initialised.
# Dev counterpart: docker/postgres/init.sql (fixed passwords, never used here).
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v migrator_pw="$APP_MIGRATOR_PASSWORD" -v runtime_pw="$APP_RUNTIME_PASSWORD" <<'SQL'
create role app_migrator login password :'migrator_pw';
create role app_runtime login password :'runtime_pw' nosuperuser nobypassrls;

alter database app owner to app_migrator;
alter schema public owner to app_migrator;
grant usage on schema public to app_runtime;

alter default privileges for role app_migrator in schema public
  grant select, insert, update, delete on tables to app_runtime;
alter default privileges for role app_migrator in schema public
  grant usage, select on sequences to app_runtime;
SQL
