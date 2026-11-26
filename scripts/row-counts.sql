-- Rows per table of the public schema, "table|count", sorted. Run as superuser (it skips RLS).
-- Production:  docker compose -f docker-compose.prod.yml exec -T postgres psql -U postgres -d app -At -f - < scripts/row-counts.sql
-- scripts/restore-pitr.sh runs the same query on the restored copy and compares (RN-12).
select table_name || '|' ||
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I', table_name), false, true, '')))[1]::text
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
order by 1;
