-- E-26 (RF-63, LGPD): a closed account keeps its data 30 days, then the daily job deletes it.
-- cancelled_at is the start of that clock; a trigger keeps it right for every code path that
-- changes tenants.status (billing webhook, paid period ending, reactivation).
ALTER TABLE "tenants" ADD COLUMN "cancelled_at" TIMESTAMPTZ;
ALTER TABLE "tenants" ADD COLUMN "data_deleted_at" TIMESTAMPTZ;

UPDATE "tenants" SET "cancelled_at" = "updated_at" WHERE "status" = 'cancelled';

CREATE FUNCTION tenants_track_cancelled_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' THEN
    NEW.cancelled_at := now();
  ELSIF NEW.status <> 'cancelled' AND OLD.status = 'cancelled' THEN
    NEW.cancelled_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tenants_track_cancelled_at
  BEFORE UPDATE OF status ON "tenants"
  FOR EACH ROW EXECUTE FUNCTION tenants_track_cancelled_at();
