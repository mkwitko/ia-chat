-- Agenda por profissional (spec 05): which services each professional performs. A professional
-- without rows performs every service (H-45). The overlap constraint is already per professional
-- (appointments_no_overlap, migration agenda).

-- CreateTable
CREATE TABLE "professional_services" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "professional_id" UUID NOT NULL,
    "service_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "professional_services_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "professional_services_tenant_id_professional_id_service_id_key" ON "professional_services"("tenant_id", "professional_id", "service_id");

-- CreateIndex
CREATE INDEX "professional_services_tenant_id_service_id_idx" ON "professional_services"("tenant_id", "service_id");

-- The FK validation reads these parents: lift their forced RLS until the end of the migration.
alter table "professionals" no force row level security;
alter table "services" no force row level security;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_tenant_id_professional_id_fkey" FOREIGN KEY ("tenant_id", "professional_id") REFERENCES "professionals"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_services" ADD CONSTRAINT "professional_services_tenant_id_service_id_fkey" FOREIGN KEY ("tenant_id", "service_id") REFERENCES "services"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written: RLS (RN-01).
alter table "professional_services" enable row level security;
alter table "professional_services" force row level security;
create policy tenant_isolation on "professional_services"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());

alter table "professionals" force row level security;
alter table "services" force row level security;
