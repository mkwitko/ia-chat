-- H-52: Pix deposit with the professional's own key and manual confirmation (spec 05).

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "expires_at" TIMESTAMPTZ,
ADD COLUMN     "notified_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "services" ADD COLUMN     "deposit_cents" INTEGER;

-- CreateTable
CREATE TABLE "deposit_settings" (
    "tenant_id" UUID NOT NULL,
    "pix_key" TEXT NOT NULL,
    "receiver_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "hold_minutes" INTEGER NOT NULL DEFAULT 30,
    "refund_policy" TEXT,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deposit_settings_pkey" PRIMARY KEY ("tenant_id")
);

-- AddForeignKey
ALTER TABLE "deposit_settings" ADD CONSTRAINT "deposit_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: money in integer cents, never negative; the sweep finds due deposits fast.
alter table "services" add constraint services_deposit_cents_positive
  check (deposit_cents is null or deposit_cents > 0);
create index payments_pending_expires_idx on "payments" (tenant_id, expires_at)
  where status = 'pending';

-- Hand-written: RLS (RN-01).
alter table "deposit_settings" enable row level security;
alter table "deposit_settings" force row level security;
create policy tenant_isolation on "deposit_settings"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
