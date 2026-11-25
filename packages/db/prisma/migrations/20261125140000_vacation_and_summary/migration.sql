-- E-22b: vacation as a kind of time off (RF-14) and the time of the nightly agenda push (RF-15).
CREATE TYPE "TimeOffKind" AS ENUM ('block', 'vacation');
ALTER TABLE "time_off" ADD COLUMN "kind" "TimeOffKind" NOT NULL DEFAULT 'block';
ALTER TABLE "tenants" ADD COLUMN "nightly_summary_minute" integer NOT NULL DEFAULT 1200;
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_nightly_summary_minute_range"
  CHECK ("nightly_summary_minute" >= 0 AND "nightly_summary_minute" < 1440);
