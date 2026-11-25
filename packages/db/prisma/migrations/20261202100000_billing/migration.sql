-- E-25: subscription (Asaas). Provider ids and the overdue ladder state live on the tenant.
ALTER TABLE "tenants" ADD COLUMN "billing_customer_id" TEXT;
ALTER TABLE "tenants" ADD COLUMN "billing_subscription_id" TEXT;
ALTER TABLE "tenants" ADD COLUMN "billing_overdue_since" TIMESTAMPTZ;
ALTER TABLE "tenants" ADD COLUMN "billing_notice_step" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "tenants" ADD COLUMN "billing_invoice_url" TEXT;
ALTER TABLE "tenants" ADD COLUMN "billing_paid_due_date" DATE;
ALTER TABLE "tenants" ADD COLUMN "billing_overage_through" DATE;
CREATE UNIQUE INDEX "tenants_billing_customer_id_key" ON "tenants"("billing_customer_id");
CREATE UNIQUE INDEX "tenants_billing_subscription_id_key" ON "tenants"("billing_subscription_id");

-- Webhook events already received: the provider's event id makes a retry harmless.
CREATE TABLE "billing_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);
