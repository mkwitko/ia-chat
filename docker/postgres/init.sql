-- Development and CI only. Production roles are provisioned in E-26.
-- RN-02: the app connects as app_runtime (no BYPASSRLS, owns nothing);
-- migrations run as app_migrator, which owns the schema.
create role app_migrator login password 'app_migrator' createdb;
create role app_runtime login password 'app_runtime' nosuperuser nobypassrls;

alter database app owner to app_migrator;
alter schema public owner to app_migrator;
grant usage on schema public to app_runtime;

alter default privileges for role app_migrator in schema public
  grant select, insert, update, delete on tables to app_runtime;
alter default privileges for role app_migrator in schema public
  grant usage, select on sequences to app_runtime;
