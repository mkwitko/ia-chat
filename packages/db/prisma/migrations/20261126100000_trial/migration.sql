-- S-05: 14-day trial without card (RF-80), abuse limits (RF-81), reminders (RF-84), end of trial (RF-88).
-- Existing tenants (the pilot) keep a null end date: they have no trial. New ones get created + 14 days.
ALTER TABLE "tenants" ADD COLUMN "trial_ends_at" timestamptz;
ALTER TABLE "tenants" ALTER COLUMN "trial_ends_at" SET DEFAULT now() + interval '14 days';
ALTER TABLE "tenants" ADD COLUMN "trial_ended_at" timestamptz;
ALTER TABLE "tenants" ADD COLUMN "reminder_1d_sent_at" timestamptz;
ALTER TABLE "tenants" ADD COLUMN "reminder_3d_sent_at" timestamptz;

-- RF-81: one trial per CPF/CNPJ (digits only; absent = not enforced). One number per tenant is already guaranteed by channel_routes.account_id (PK).
ALTER TABLE "tenants" ADD COLUMN "document" text;
CREATE UNIQUE INDEX "tenants_document_key" ON "tenants" ("document") WHERE "document" IS NOT NULL;
