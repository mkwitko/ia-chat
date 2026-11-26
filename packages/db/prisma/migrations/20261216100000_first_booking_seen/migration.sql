-- Round 3 (26/11/2026): Início's "first booking" card is closed once per account, not per browser.
-- "tenants" is the root table (no tenant_id, no RLS): the route writes only its own row, by id,
-- like weekly_report.

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "first_booking_seen_at" TIMESTAMPTZ;
