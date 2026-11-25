-- CreateEnum
CREATE TYPE "ContactOrigin" AS ENUM ('whatsapp_direct', 'referral', 'site', 'ad_click', 'imported', 'manual');

-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('new_contact', 'booked', 'attended', 'not_booked', 'lost');

-- CreateEnum
CREATE TYPE "LostReason" AS ENUM ('price', 'distance', 'chose_other', 'no_longer_needed', 'wrong_number', 'other');

-- CreateEnum
CREATE TYPE "StageSource" AS ENUM ('derived', 'manual');

-- CreateEnum
CREATE TYPE "ConsentKind" AS ENUM ('opt_in', 'opt_out');

-- CreateEnum
CREATE TYPE "ConsentCategory" AS ENUM ('service', 'marketing', 'all');

-- CreateEnum
CREATE TYPE "ConsentSource" AS ENUM ('patient_message', 'owner_panel', 'backfill');

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "lost_reason" "LostReason",
ADD COLUMN     "origin" "ContactOrigin" NOT NULL DEFAULT 'whatsapp_direct',
ADD COLUMN     "origin_ref" TEXT,
ADD COLUMN     "stage_override" "PipelineStage",
ADD COLUMN     "stage_override_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "contact_stage_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "from_stage" "PipelineStage",
    "to_stage" "PipelineStage" NOT NULL,
    "source" "StageSource" NOT NULL,
    "actor_id" TEXT,
    "lost_reason" "LostReason",
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_stage_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consent_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "kind" "ConsentKind" NOT NULL,
    "category" "ConsentCategory" NOT NULL,
    "source" "ConsentSource" NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contact_stage_events_tenant_id_contact_id_created_at_idx" ON "contact_stage_events"("tenant_id", "contact_id", "created_at");

-- CreateIndex
CREATE INDEX "contact_stage_events_tenant_id_created_at_idx" ON "contact_stage_events"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "consent_events_tenant_id_contact_id_created_at_idx" ON "consent_events"("tenant_id", "contact_id", "created_at");

-- The FK validation reads contacts: lift its forced RLS until the end of the migration.
alter table "contacts" no force row level security;

-- AddForeignKey
ALTER TABLE "contact_stage_events" ADD CONSTRAINT "contact_stage_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_stage_events" ADD CONSTRAINT "contact_stage_events_tenant_id_contact_id_fkey" FOREIGN KEY ("tenant_id", "contact_id") REFERENCES "contacts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_tenant_id_contact_id_fkey" FOREIGN KEY ("tenant_id", "contact_id") REFERENCES "contacts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Hand-written: RLS and backfill.
alter table "contact_stage_events" enable row level security;
alter table "contact_stage_events" force row level security;
create policy tenant_isolation on "contact_stage_events"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "consent_events" enable row level security;
alter table "consent_events" force row level security;
create policy tenant_isolation on "consent_events"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());

-- Both are histories: the app adds, never rewrites or removes.
revoke update, delete, truncate on table "contact_stage_events" from app_runtime;
revoke update, delete, truncate on table "consent_events" from app_runtime;

-- Backfill (forced RLS lifted for the statements, as in professional_backfill).
alter table "consent_events" no force row level security;
alter table "conversations" no force row level security;
-- A contact without any conversation was typed in by the owner (agenda); the rest wrote first.
update "contacts" c set "origin" = 'manual'
where not exists (select 1 from "conversations" v where v.tenant_id = c.tenant_id and v.contact_id = c.id);
-- The opt-out that already happened becomes the first consent entry (date known, actor not).
insert into "consent_events" ("tenant_id", "contact_id", "kind", "category", "source", "actor_type", "created_at")
select c.tenant_id, c.id, 'opt_out', 'all', 'backfill', 'system', c.opt_out_at
from "contacts" c where c.opt_out_at is not null;
alter table "consent_events" force row level security;
alter table "conversations" force row level security;
alter table "contacts" force row level security;
