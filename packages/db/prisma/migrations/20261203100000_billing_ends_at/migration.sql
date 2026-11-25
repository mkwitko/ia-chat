-- E-25: a cancelled subscription keeps the assistant on until the end of the period already paid.
ALTER TABLE "tenants" ADD COLUMN "billing_ends_at" TIMESTAMPTZ;
