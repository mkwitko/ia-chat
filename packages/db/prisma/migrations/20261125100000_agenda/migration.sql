-- E-20: appointments Prisma can read, and the exclusion constraint that decides double bookings.

create extension if not exists btree_gist;

-- CreateEnum
CREATE TYPE "AppointmentCreator" AS ENUM ('ai', 'human');

-- The tstzrange column was unreadable by Prisma; two timestamptz columns replace it.
ALTER TABLE "appointments"
  ADD COLUMN "starts_at" timestamptz,
  ADD COLUMN "ends_at" timestamptz,
  ADD COLUMN "created_by" "AppointmentCreator" NOT NULL DEFAULT 'human',
  ADD COLUMN "idempotency_key" text;
-- The owner migrates across tenants: lift the forced RLS just for the backfill.
alter table "appointments" no force row level security;
UPDATE "appointments" SET "starts_at" = lower("during"), "ends_at" = upper("during");
alter table "appointments" force row level security;
ALTER TABLE "appointments"
  ALTER COLUMN "starts_at" SET NOT NULL,
  ALTER COLUMN "ends_at" SET NOT NULL,
  DROP COLUMN "during";

alter table "appointments" add constraint appointments_window check (starts_at < ends_at);

-- A-10: concurrent bookings of the same slot; the loser gets error 23P01 (slot_taken).
-- Cancelled appointments free the slot. (Spec 05 also names `held`; no such status exists yet.)
alter table "appointments" add constraint appointments_no_overlap
  exclude using gist (professional_id with =, tstzrange(starts_at, ends_at) with &&)
  where (status <> 'cancelled');

create unique index appointments_idempotency_key
  on "appointments" (tenant_id, idempotency_key) where idempotency_key is not null;
CREATE INDEX "appointments_tenant_id_contact_id_idx" ON "appointments"("tenant_id", "contact_id");

ALTER TABLE "conversations" ADD COLUMN "offered_slots" jsonb NOT NULL DEFAULT '[]';
ALTER TABLE "tenants" ADD COLUMN "cancel_notice_minutes" integer NOT NULL DEFAULT 1440;
