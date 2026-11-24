-- CreateTable
CREATE TABLE "channel_routes" (
    "account_id" TEXT NOT NULL,
    "tenant_id" UUID NOT NULL,
    "channel_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "channel_routes_pkey" PRIMARY KEY ("account_id")
);

-- CreateIndex
CREATE INDEX "channel_routes_tenant_id_channel_id_idx" ON "channel_routes"("tenant_id", "channel_id");

-- AddForeignKey (NOT VALID: the table is new and empty, and validating would read
-- channels under its forced RLS; row inserts are still checked, RI bypasses RLS)
ALTER TABLE "channel_routes" ADD CONSTRAINT "channel_routes_tenant_id_channel_id_fkey" FOREIGN KEY ("tenant_id", "channel_id") REFERENCES "channels"("tenant_id", "id") ON DELETE CASCADE ON UPDATE CASCADE NOT VALID;


-- Platform table: read by the webhook before a tenant is known (E-09). The app may add and
-- remove routes (onboarding, disconnection) but never rewrite one to point elsewhere.
revoke update, truncate on table "channel_routes" from app_runtime;
