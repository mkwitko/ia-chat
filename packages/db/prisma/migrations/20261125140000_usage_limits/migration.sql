-- E-18: overage cap chosen by the owner (cents, null = no cap) and the once-per-month warnings.
ALTER TABLE "tenants" ADD COLUMN "overage_cap_cents" integer;
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_overage_cap_cents_check" CHECK ("overage_cap_cents" >= 0);
ALTER TABLE "usage_counters" ADD COLUMN "warned_80_at" timestamptz;
ALTER TABLE "usage_counters" ADD COLUMN "warned_100_at" timestamptz;
