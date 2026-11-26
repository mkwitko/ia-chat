-- M-09: slot waitlist (entries and the offers sent from them), the remarcação link on
-- appointments (metric 8) and the owner's switch for the message after a no-show.

-- CreateEnum
CREATE TYPE "WaitlistStatus" AS ENUM ('waiting', 'booked', 'removed', 'expired');

-- CreateEnum
CREATE TYPE "SlotOfferState" AS ENUM ('open', 'accepted', 'expired', 'skipped');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "no_show_follow_up" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "appointments" ADD COLUMN     "rescheduled_from_id" UUID;

-- CreateTable
CREATE TABLE "slot_waitlist_entries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "window_start" TIMESTAMPTZ NOT NULL,
    "window_end" TIMESTAMPTZ NOT NULL,
    "status" "WaitlistStatus" NOT NULL DEFAULT 'waiting',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_offers" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "state" "SlotOfferState" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "slot_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "slot_waitlist_entries_tenant_id_status_window_start_idx" ON "slot_waitlist_entries"("tenant_id", "status", "window_start");

-- CreateIndex
CREATE UNIQUE INDEX "slot_waitlist_entries_tenant_id_id_key" ON "slot_waitlist_entries"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "slot_offers_tenant_id_state_expires_at_idx" ON "slot_offers"("tenant_id", "state", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "slot_offers_entry_id_starts_at_key" ON "slot_offers"("entry_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_tenant_id_rescheduled_from_id_key" ON "appointments"("tenant_id", "rescheduled_from_id");

-- The FK validation reads these parents: lift their forced RLS until the end of the migration.
alter table "appointments" no force row level security;
alter table "contacts" no force row level security;
alter table "services" no force row level security;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_rescheduled_from_id_fkey" FOREIGN KEY ("tenant_id", "rescheduled_from_id") REFERENCES "appointments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_waitlist_entries" ADD CONSTRAINT "slot_waitlist_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_waitlist_entries" ADD CONSTRAINT "slot_waitlist_entries_tenant_id_contact_id_fkey" FOREIGN KEY ("tenant_id", "contact_id") REFERENCES "contacts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_waitlist_entries" ADD CONSTRAINT "slot_waitlist_entries_tenant_id_service_id_fkey" FOREIGN KEY ("tenant_id", "service_id") REFERENCES "services"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_offers" ADD CONSTRAINT "slot_offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_offers" ADD CONSTRAINT "slot_offers_tenant_id_entry_id_fkey" FOREIGN KEY ("tenant_id", "entry_id") REFERENCES "slot_waitlist_entries"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written. A client has one live request per service; a slot has one open offer at a time
-- (the next entry only after it expires; "first to confirm" still goes through the booking constraint).
CREATE UNIQUE INDEX "slot_waitlist_entries_one_waiting" ON "slot_waitlist_entries"("tenant_id", "contact_id", "service_id") WHERE "status" = 'waiting';
CREATE UNIQUE INDEX "slot_offers_one_open_per_slot" ON "slot_offers"("tenant_id", "starts_at") WHERE "state" = 'open';
ALTER TABLE "slot_waitlist_entries" ADD CONSTRAINT "slot_waitlist_entries_window" CHECK ("window_end" > "window_start");

-- RN-01: tenant isolation.
alter table "slot_waitlist_entries" enable row level security;
alter table "slot_waitlist_entries" force row level security;
create policy tenant_isolation on "slot_waitlist_entries"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "slot_offers" enable row level security;
alter table "slot_offers" force row level security;
create policy tenant_isolation on "slot_offers"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
revoke truncate on table "slot_waitlist_entries" from app_runtime;
revoke truncate on table "slot_offers" from app_runtime;

alter table "appointments" force row level security;
alter table "contacts" force row level security;
alter table "services" force row level security;
