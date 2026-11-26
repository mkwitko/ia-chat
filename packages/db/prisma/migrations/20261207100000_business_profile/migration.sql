-- M-04: the business profile (description, contacts, payment methods, cancellation policy text,
-- welcome message, packages with prices in cents). Shape validated in packages/core.
ALTER TABLE "tenants" ADD COLUMN "business_profile" JSONB NOT NULL DEFAULT '{}';
