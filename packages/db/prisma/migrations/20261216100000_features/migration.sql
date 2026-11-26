-- Recursos (H-51): the owner's on/off per feature; no row = the plan's default.

-- CreateEnum
CREATE TYPE "FeatureKey" AS ENUM ('audio_transcription', 'pix_deposit', 'ocr_pix_receipt', 'ocr_id_card', 'ocr_medical_request');

-- CreateTable
CREATE TABLE "feature_settings" (
    "tenant_id" UUID NOT NULL,
    "feature" "FeatureKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_settings_pkey" PRIMARY KEY ("tenant_id","feature")
);

-- AddForeignKey
ALTER TABLE "feature_settings" ADD CONSTRAINT "feature_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: RLS (RN-01).
alter table "feature_settings" enable row level security;
alter table "feature_settings" force row level security;
create policy tenant_isolation on "feature_settings"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
