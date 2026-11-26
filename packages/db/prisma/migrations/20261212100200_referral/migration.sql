-- M-11: each business has a short referral code (created on first use, unique), and a waitlist
-- sign-up records the code of the business whose link it came from. Attribution only: no message
-- is ever sent to a referred person because of this column.
ALTER TABLE "tenants" ADD COLUMN "referral_code" TEXT;
CREATE UNIQUE INDEX "tenants_referral_code_key" ON "tenants"("referral_code");

ALTER TABLE "waitlist_entries" ADD COLUMN "referral_code" TEXT;
CREATE INDEX "waitlist_entries_referral_code_idx" ON "waitlist_entries"("referral_code");
