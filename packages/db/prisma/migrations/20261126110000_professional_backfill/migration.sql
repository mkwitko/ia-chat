-- Tenants created from the panel before the creation hook had no professional, and agenda,
-- tone and the agent all need one. Create it named after the owner (else the tenant name).
alter table "professionals" no force row level security;
insert into "professionals" ("tenant_id", "name")
select t.id, coalesce(
  (select u.name from memberships m join users u on u.id = m.user_id
    where m.tenant_id = t.id order by m.created_at limit 1),
  t.name)
from tenants t
where not exists (select 1 from professionals p where p.tenant_id = t.id);
alter table "professionals" force row level security;
