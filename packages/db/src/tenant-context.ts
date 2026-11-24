/** Postgres setting that carries the current tenant; read by app_current_tenant() in SQL. */
export const TENANT_SETTING = 'app.tenant_id';

/** Prefix of the error raised by app_current_tenant() (migration 20261124120000_tenant_context). */
export const TENANT_CONTEXT_MISSING = 'tenant context missing';

export const INVALID_TENANT_ID = 'withTenant: tenantId must be a UUID';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}
