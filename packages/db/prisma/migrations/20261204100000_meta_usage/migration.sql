-- H-05: Meta WhatsApp usage per tenant, from the status webhook `pricing` object.
-- One row per delivered business message; the unique key makes repeated statuses a no-op.
CREATE TYPE "MetaCategory" AS ENUM ('service', 'utility', 'marketing', 'authentication', 'other');

CREATE TABLE "meta_message_usage" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "provider_message_id" TEXT NOT NULL,
    "month" DATE NOT NULL,
    "category" "MetaCategory" NOT NULL,
    "billable" BOOLEAN NOT NULL,
    "pricing_type" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meta_message_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "meta_message_usage_tenant_id_channel_id_provider_message_id_key"
  ON "meta_message_usage"("tenant_id", "channel_id", "provider_message_id");
CREATE INDEX "meta_message_usage_tenant_id_month_idx" ON "meta_message_usage"("tenant_id", "month");

ALTER TABLE "meta_message_usage" ADD CONSTRAINT "meta_message_usage_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Validating the composite FK reads channels as the owner: lift the forced RLS just for that.
alter table "channels" no force row level security;
ALTER TABLE "meta_message_usage" ADD CONSTRAINT "meta_message_usage_tenant_id_channel_id_fkey"
  FOREIGN KEY ("tenant_id", "channel_id") REFERENCES "channels"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
alter table "channels" force row level security;

alter table "meta_message_usage" enable row level security;
alter table "meta_message_usage" force row level security;
create policy tenant_isolation on "meta_message_usage"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
revoke truncate on table "meta_message_usage" from app_runtime;
