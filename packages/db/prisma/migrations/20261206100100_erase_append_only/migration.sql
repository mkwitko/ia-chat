-- E-26 (RF-63): consent_events and contact_stage_events are append-only for the app role, but they
-- point to contacts, so a closed account's contacts cannot be erased while they exist. This is the
-- only way to delete them: a definer function that works on one tenant (RLS still applies, the
-- caller's tenant context must match) and refuses any tenant whose account is still open.
CREATE FUNCTION erase_closed_tenant_events(p_tenant uuid) RETURNS void
  LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tenants
    WHERE id = p_tenant AND status IN ('cancelled', 'restricted') AND data_deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'tenant account is open';
  END IF;
  DELETE FROM consent_events WHERE tenant_id = p_tenant;
  DELETE FROM contact_stage_events WHERE tenant_id = p_tenant;
END;
$$;

REVOKE ALL ON FUNCTION erase_closed_tenant_events(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION erase_closed_tenant_events(uuid) TO app_runtime;
