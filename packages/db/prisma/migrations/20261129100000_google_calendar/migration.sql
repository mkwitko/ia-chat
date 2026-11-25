-- E-21: Google Calendar integration. Tokens are stored as AES-GCM ciphertext (spec 06).
CREATE TYPE "CalendarStatus" AS ENUM ('connected', 'needs_reconnect');
CREATE TYPE "CalendarSyncState" AS ENUM ('none', 'synced', 'failed');

CREATE TABLE "calendar_integrations" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "status" "CalendarStatus" NOT NULL DEFAULT 'connected',
    "refresh_token_enc" TEXT NOT NULL,
    "access_token_enc" TEXT,
    "access_expires_at" TIMESTAMPTZ,
    "calendar_id" TEXT,
    "calendar_name" TEXT,
    "connected_by_user" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "calendar_integrations_tenant_id_key" ON "calendar_integrations"("tenant_id");

ALTER TABLE "calendar_integrations" ADD CONSTRAINT "calendar_integrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RN-01: tenant isolation.
alter table "calendar_integrations" enable row level security;
alter table "calendar_integrations" force row level security;
create policy tenant_isolation on "calendar_integrations"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
revoke truncate on table "calendar_integrations" from app_runtime;

ALTER TABLE "appointments" ADD COLUMN "calendar_sync" "CalendarSyncState" NOT NULL DEFAULT 'none';
