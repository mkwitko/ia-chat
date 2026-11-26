-- E-24b: the coexistence history lands in a staging area; the owner picks who becomes a client and
-- whose messages come over. Staged rows are purged after 7 days.

-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "history_reviewed_at" TIMESTAMPTZ;

-- CreateTable
CREATE TABLE "import_contacts" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "bsuid" TEXT,
    "phone_e164" TEXT,
    "name" TEXT,
    "message_count" INTEGER NOT NULL DEFAULT 0,
    "first_message_at" TIMESTAMPTZ,
    "last_message_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_messages" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "import_contact_id" UUID NOT NULL,
    "provider_message_id" TEXT NOT NULL,
    "from_owner" BOOLEAN NOT NULL,
    "type" "MessageType" NOT NULL,
    "text" TEXT,
    "media" JSONB,
    "at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "import_contacts_tenant_id_id_key" ON "import_contacts"("tenant_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "import_contacts_tenant_id_channel_id_key_key" ON "import_contacts"("tenant_id", "channel_id", "key");

-- CreateIndex
CREATE INDEX "import_messages_tenant_id_import_contact_id_at_idx" ON "import_messages"("tenant_id", "import_contact_id", "at");

-- CreateIndex
CREATE UNIQUE INDEX "import_messages_tenant_id_import_contact_id_provider_messag_key" ON "import_messages"("tenant_id", "import_contact_id", "provider_message_id");

-- AddForeignKey
ALTER TABLE "import_contacts" ADD CONSTRAINT "import_contacts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_messages" ADD CONSTRAINT "import_messages_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_messages" ADD CONSTRAINT "import_messages_tenant_id_import_contact_id_fkey" FOREIGN KEY ("tenant_id", "import_contact_id") REFERENCES "import_contacts"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: RLS (RN-01).
alter table "import_contacts" enable row level security;
alter table "import_contacts" force row level security;
create policy tenant_isolation on "import_contacts"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
alter table "import_messages" enable row level security;
alter table "import_messages" force row level security;
create policy tenant_isolation on "import_messages"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
