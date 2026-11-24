-- Migration bookkeeping is not the app's business.
revoke all on table _prisma_migrations from app_runtime;

-- Tenant of the current transaction, set by withTenant via set_config(..., true).
-- RLS policies call this, so a business query outside withTenant fails loudly
-- instead of silently returning nothing.
create function app_current_tenant() returns uuid
  language plpgsql stable
as $$
declare
  v text := current_setting('app.tenant_id', true);
begin
  if v is null or v = '' then
    raise exception 'tenant context missing: business query outside withTenant'
      using errcode = 'insufficient_privilege';
  end if;
  return v::uuid;
end
$$;
