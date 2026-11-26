-- Research 09 #7: session packages a client bought and the ledger of sessions used. A record
-- only (we never hold patient money); name and counts, nothing clinical.

-- CreateEnum
CREATE TYPE "PackageEntryReason" AS ENUM ('attended', 'attendance_undone', 'correction', 'courtesy', 'outside_panel', 'other');

-- CreateTable
CREATE TABLE "client_packages" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sessions" INTEGER NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "purchased_on" DATE NOT NULL,
    "paid" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_packages_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "client_packages_sessions_check" CHECK ("sessions" BETWEEN 1 AND 100),
    CONSTRAINT "client_packages_price_check" CHECK ("price_cents" >= 0)
);

-- CreateTable
CREATE TABLE "package_entries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "package_id" UUID NOT NULL,
    "appointment_id" UUID,
    "delta" INTEGER NOT NULL,
    "reason" "PackageEntryReason" NOT NULL,
    "actor_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "package_entries_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "package_entries_delta_check" CHECK ("delta" IN (-1, 1))
);

-- CreateIndex
CREATE UNIQUE INDEX "client_packages_tenant_id_id_key" ON "client_packages"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "client_packages_tenant_id_contact_id_purchased_on_idx" ON "client_packages"("tenant_id", "contact_id", "purchased_on");

-- CreateIndex
CREATE INDEX "package_entries_tenant_id_package_id_idx" ON "package_entries"("tenant_id", "package_id");

-- CreateIndex
CREATE INDEX "package_entries_tenant_id_appointment_id_idx" ON "package_entries"("tenant_id", "appointment_id");

-- The FK validation reads contacts and appointments: lift their forced RLS until the end.
alter table "contacts" no force row level security;
alter table "appointments" no force row level security;

-- AddForeignKey
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_packages" ADD CONSTRAINT "client_packages_tenant_id_contact_id_fkey" FOREIGN KEY ("tenant_id", "contact_id") REFERENCES "contacts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_entries" ADD CONSTRAINT "package_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_entries" ADD CONSTRAINT "package_entries_tenant_id_package_id_fkey" FOREIGN KEY ("tenant_id", "package_id") REFERENCES "client_packages"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_entries" ADD CONSTRAINT "package_entries_tenant_id_appointment_id_fkey" FOREIGN KEY ("tenant_id", "appointment_id") REFERENCES "appointments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: RLS (RN-01).
alter table "client_packages" enable row level security;
alter table "client_packages" force row level security;
create policy tenant_isolation on "client_packages"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "package_entries" enable row level security;
alter table "package_entries" force row level security;
create policy tenant_isolation on "package_entries"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());

-- The ledger is a history: the app adds and, only when a closed account is erased, deletes.
revoke update, truncate on table "package_entries" from app_runtime;

alter table "contacts" force row level security;
alter table "appointments" force row level security;
