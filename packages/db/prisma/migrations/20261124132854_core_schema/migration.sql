-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('essencial', 'agenda', 'pro', 'clinica');

-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('trial', 'active', 'restricted', 'cancelled');

-- CreateEnum
CREATE TYPE "ChannelKind" AS ENUM ('cloud_api', 'qr_gateway');

-- CreateEnum
CREATE TYPE "ChannelStatus" AS ENUM ('pending', 'connected', 'disconnected');

-- CreateEnum
CREATE TYPE "KnowledgeSource" AS ENUM ('manual', 'unanswered', 'history');

-- CreateEnum
CREATE TYPE "ConversationControl" AS ENUM ('ai', 'human');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "MessageAuthor" AS ENUM ('patient', 'ai', 'human', 'system');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('text', 'audio', 'image', 'document', 'sticker', 'location', 'interactive_reply', 'template', 'unsupported');

-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('received', 'pending', 'sent', 'delivered', 'read', 'failed');

-- CreateEnum
CREATE TYPE "TurnState" AS ENUM ('pending', 'running', 'draft', 'sent', 'discarded', 'failed');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'confirmed', 'cancelled', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "ScheduledMessageKind" AS ENUM ('reminder', 'confirmation', 'follow_up');

-- CreateEnum
CREATE TYPE "ScheduledMessageState" AS ENUM ('scheduled', 'sent', 'cancelled', 'failed');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'held', 'paid', 'expired', 'refunded');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "name" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'essencial',
    "status" "TenantStatus" NOT NULL DEFAULT 'trial',
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "specialty_policy_id" UUID,
    "limits" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "specialty_policies" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "specialty" TEXT NOT NULL,
    "rules" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "specialty_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tone_of_voice" TEXT,
    "message_examples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "google_calendar_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channels" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "kind" "ChannelKind" NOT NULL,
    "status" "ChannelStatus" NOT NULL DEFAULT 'pending',
    "display_phone" TEXT,
    "phone_number_id" TEXT,
    "waba_id" TEXT,
    "coexistence" BOOLEAN NOT NULL DEFAULT false,
    "gateway_session" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "visible_to_patient" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability_rules" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "start_time" TIME(0) NOT NULL,
    "end_time" TIME(0) NOT NULL,
    "slot_interval_minutes" INTEGER NOT NULL DEFAULT 0,
    "min_notice_minutes" INTEGER NOT NULL DEFAULT 120,
    "max_advance_days" INTEGER NOT NULL DEFAULT 60,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "availability_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_off" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "starts_at" TIMESTAMPTZ NOT NULL,
    "ends_at" TIMESTAMPTZ NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_off_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "arrival_instructions" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_items" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "source" "KnowledgeSource" NOT NULL DEFAULT 'manual',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "knowledge_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "bsuid" TEXT,
    "phone_e164" TEXT,
    "phone_key" TEXT,
    "name" TEXT,
    "consents" JSONB NOT NULL DEFAULT '{}',
    "opt_out_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "control" "ConversationControl" NOT NULL DEFAULT 'ai',
    "control_reason" TEXT,
    "control_changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pause_expires_at" TIMESTAMPTZ,
    "window_expires_at" TIMESTAMPTZ,
    "turn_version" INTEGER NOT NULL DEFAULT 0,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "author" "MessageAuthor" NOT NULL,
    "type" "MessageType" NOT NULL,
    "text" TEXT,
    "media" JSONB,
    "provider_message_id" TEXT,
    "provider_timestamp" TIMESTAMPTZ,
    "status" "MessageStatus" NOT NULL,
    "error_code" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inbound_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "channel_id" UUID,
    "provider" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "payload_hash" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,
    "error" TEXT,

    CONSTRAINT "inbound_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turns" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "message_ids" UUID[] DEFAULT ARRAY[]::UUID[],
    "state" "TurnState" NOT NULL DEFAULT 'pending',
    "model" TEXT,
    "cost_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ,

    CONSTRAINT "turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "location_id" UUID,
    "during" tstzrange NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'scheduled',
    "google_event_id" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_messages" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "contact_id" UUID NOT NULL,
    "appointment_id" UUID,
    "conversation_id" UUID,
    "kind" "ScheduledMessageKind" NOT NULL,
    "template_name" TEXT,
    "send_at" TIMESTAMPTZ NOT NULL,
    "state" "ScheduledMessageState" NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scheduled_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "appointment_id" UUID,
    "amount_cents" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_charge_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_usage" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "conversation_id" UUID,
    "turn_id" UUID,
    "task" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "cached_input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "cost_micro_usd" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_counters" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "month" DATE NOT NULL,
    "conversations" INTEGER NOT NULL DEFAULT 0,
    "messages_by_category" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "actor_type" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "specialty_policies_specialty_key" ON "specialty_policies"("specialty");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_tenant_id_id_key" ON "professionals"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "channels_tenant_id_id_key" ON "channels"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "services_tenant_id_id_key" ON "services"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "availability_rules_tenant_id_professional_id_idx" ON "availability_rules"("tenant_id", "professional_id");

-- CreateIndex
CREATE INDEX "time_off_tenant_id_professional_id_starts_at_idx" ON "time_off"("tenant_id", "professional_id", "starts_at");

-- CreateIndex
CREATE UNIQUE INDEX "locations_tenant_id_id_key" ON "locations"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "knowledge_items_tenant_id_active_idx" ON "knowledge_items"("tenant_id", "active");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_tenant_id_id_key" ON "contacts"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_tenant_id_bsuid_key" ON "contacts"("tenant_id", "bsuid");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_tenant_id_phone_key_key" ON "contacts"("tenant_id", "phone_key");

-- CreateIndex
CREATE INDEX "conversations_tenant_id_last_message_at_idx" ON "conversations"("tenant_id", "last_message_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "conversations_tenant_id_id_key" ON "conversations"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_tenant_id_channel_id_contact_id_key" ON "conversations"("tenant_id", "channel_id", "contact_id");

-- CreateIndex
CREATE INDEX "messages_tenant_id_conversation_id_provider_timestamp_idx" ON "messages"("tenant_id", "conversation_id", "provider_timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "messages_tenant_id_channel_id_provider_message_id_key" ON "messages"("tenant_id", "channel_id", "provider_message_id");

-- CreateIndex
CREATE UNIQUE INDEX "inbound_events_tenant_id_payload_hash_key" ON "inbound_events"("tenant_id", "payload_hash");

-- CreateIndex
CREATE INDEX "turns_tenant_id_conversation_id_version_idx" ON "turns"("tenant_id", "conversation_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "turns_tenant_id_id_key" ON "turns"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "appointments_tenant_id_professional_id_idx" ON "appointments"("tenant_id", "professional_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_tenant_id_id_key" ON "appointments"("tenant_id", "id");

-- CreateIndex
CREATE INDEX "scheduled_messages_tenant_id_send_at_idx" ON "scheduled_messages"("tenant_id", "send_at");

-- CreateIndex
CREATE INDEX "payments_tenant_id_appointment_id_idx" ON "payments"("tenant_id", "appointment_id");

-- CreateIndex
CREATE INDEX "ai_usage_tenant_id_created_at_idx" ON "ai_usage"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "usage_counters_tenant_id_month_key" ON "usage_counters"("tenant_id", "month");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_created_at_idx" ON "audit_log"("tenant_id", "created_at");

-- AddForeignKey
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_specialty_policy_id_fkey" FOREIGN KEY ("specialty_policy_id") REFERENCES "specialty_policies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channels" ADD CONSTRAINT "channels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_rules" ADD CONSTRAINT "availability_rules_tenant_id_professional_id_fkey" FOREIGN KEY ("tenant_id", "professional_id") REFERENCES "professionals"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "time_off" ADD CONSTRAINT "time_off_tenant_id_professional_id_fkey" FOREIGN KEY ("tenant_id", "professional_id") REFERENCES "professionals"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "knowledge_items" ADD CONSTRAINT "knowledge_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_channel_id_fkey" FOREIGN KEY ("tenant_id", "channel_id") REFERENCES "channels"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_tenant_id_contact_id_fkey" FOREIGN KEY ("tenant_id", "contact_id") REFERENCES "contacts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_tenant_id_conversation_id_fkey" FOREIGN KEY ("tenant_id", "conversation_id") REFERENCES "conversations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_events" ADD CONSTRAINT "inbound_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inbound_events" ADD CONSTRAINT "inbound_events_tenant_id_channel_id_fkey" FOREIGN KEY ("tenant_id", "channel_id") REFERENCES "channels"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turns" ADD CONSTRAINT "turns_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turns" ADD CONSTRAINT "turns_tenant_id_conversation_id_fkey" FOREIGN KEY ("tenant_id", "conversation_id") REFERENCES "conversations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_professional_id_fkey" FOREIGN KEY ("tenant_id", "professional_id") REFERENCES "professionals"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_contact_id_fkey" FOREIGN KEY ("tenant_id", "contact_id") REFERENCES "contacts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_service_id_fkey" FOREIGN KEY ("tenant_id", "service_id") REFERENCES "services"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_tenant_id_location_id_fkey" FOREIGN KEY ("tenant_id", "location_id") REFERENCES "locations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_tenant_id_contact_id_fkey" FOREIGN KEY ("tenant_id", "contact_id") REFERENCES "contacts"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_tenant_id_appointment_id_fkey" FOREIGN KEY ("tenant_id", "appointment_id") REFERENCES "appointments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_messages" ADD CONSTRAINT "scheduled_messages_tenant_id_conversation_id_fkey" FOREIGN KEY ("tenant_id", "conversation_id") REFERENCES "conversations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_appointment_id_fkey" FOREIGN KEY ("tenant_id", "appointment_id") REFERENCES "appointments"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_tenant_id_conversation_id_fkey" FOREIGN KEY ("tenant_id", "conversation_id") REFERENCES "conversations"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_tenant_id_turn_id_fkey" FOREIGN KEY ("tenant_id", "turn_id") REFERENCES "turns"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_counters" ADD CONSTRAINT "usage_counters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===================== Hand-written: not expressible in schema.prisma =====================

-- RN-01: tenant isolation. FORCE so that even the owner role is subject to it.
-- app_current_tenant() raises when no tenant is set (see 20261124120000_tenant_context).
alter table "professionals" enable row level security;
alter table "professionals" force row level security;
create policy tenant_isolation on "professionals"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "channels" enable row level security;
alter table "channels" force row level security;
create policy tenant_isolation on "channels"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "services" enable row level security;
alter table "services" force row level security;
create policy tenant_isolation on "services"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "availability_rules" enable row level security;
alter table "availability_rules" force row level security;
create policy tenant_isolation on "availability_rules"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "time_off" enable row level security;
alter table "time_off" force row level security;
create policy tenant_isolation on "time_off"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "locations" enable row level security;
alter table "locations" force row level security;
create policy tenant_isolation on "locations"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "knowledge_items" enable row level security;
alter table "knowledge_items" force row level security;
create policy tenant_isolation on "knowledge_items"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "contacts" enable row level security;
alter table "contacts" force row level security;
create policy tenant_isolation on "contacts"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "conversations" enable row level security;
alter table "conversations" force row level security;
create policy tenant_isolation on "conversations"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "messages" enable row level security;
alter table "messages" force row level security;
create policy tenant_isolation on "messages"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "inbound_events" enable row level security;
alter table "inbound_events" force row level security;
create policy tenant_isolation on "inbound_events"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "turns" enable row level security;
alter table "turns" force row level security;
create policy tenant_isolation on "turns"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "appointments" enable row level security;
alter table "appointments" force row level security;
create policy tenant_isolation on "appointments"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "scheduled_messages" enable row level security;
alter table "scheduled_messages" force row level security;
create policy tenant_isolation on "scheduled_messages"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "payments" enable row level security;
alter table "payments" force row level security;
create policy tenant_isolation on "payments"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "ai_usage" enable row level security;
alter table "ai_usage" force row level security;
create policy tenant_isolation on "ai_usage"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "usage_counters" enable row level security;
alter table "usage_counters" force row level security;
create policy tenant_isolation on "usage_counters"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "audit_log" enable row level security;
alter table "audit_log" force row level security;
create policy tenant_isolation on "audit_log"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());

-- Integrity rules.
alter table "services" add constraint services_duration_positive check (duration_minutes > 0);
alter table "services" add constraint services_price_non_negative check (price_cents >= 0);
alter table "availability_rules" add constraint availability_rules_weekday check (weekday between 0 and 6);
alter table "availability_rules" add constraint availability_rules_window check (start_time < end_time);
alter table "time_off" add constraint time_off_window check (starts_at < ends_at);
alter table "contacts" add constraint contacts_identity check (bsuid is not null or phone_key is not null);
alter table "payments" add constraint payments_amount_positive check (amount_cents > 0);
alter table "turns" add constraint turns_version_non_negative check (version >= 0);

-- RN-07: audit log is append-only for the app.
revoke update, delete, truncate on table "audit_log" from app_runtime;

-- Specialty policies are a platform catalog: the app only reads them.
revoke insert, update, delete, truncate on table "specialty_policies" from app_runtime;

-- No table may be truncated by the app (truncate bypasses RLS).
revoke truncate on table "professionals" from app_runtime;
revoke truncate on table "channels" from app_runtime;
revoke truncate on table "services" from app_runtime;
revoke truncate on table "availability_rules" from app_runtime;
revoke truncate on table "time_off" from app_runtime;
revoke truncate on table "locations" from app_runtime;
revoke truncate on table "knowledge_items" from app_runtime;
revoke truncate on table "contacts" from app_runtime;
revoke truncate on table "conversations" from app_runtime;
revoke truncate on table "messages" from app_runtime;
revoke truncate on table "inbound_events" from app_runtime;
revoke truncate on table "turns" from app_runtime;
revoke truncate on table "appointments" from app_runtime;
revoke truncate on table "scheduled_messages" from app_runtime;
revoke truncate on table "payments" from app_runtime;
revoke truncate on table "ai_usage" from app_runtime;
revoke truncate on table "usage_counters" from app_runtime;
revoke truncate on table "audit_log" from app_runtime;
revoke truncate on table "tenants" from app_runtime;
