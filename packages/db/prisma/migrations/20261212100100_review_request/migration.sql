-- M-12: the owner's switch and delay (hours) for the review request after "Compareceu", and the
-- ledger kind that keeps it to one per appointment (and one per client per 90 days).
ALTER TYPE "ScheduledMessageKind" ADD VALUE 'review_request';

ALTER TABLE "tenants"
  ADD COLUMN "review_request" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "review_request_delay_hours" INTEGER NOT NULL DEFAULT 3,
  ADD CONSTRAINT "tenants_review_request_delay_check" CHECK ("review_request_delay_hours" BETWEEN 1 AND 48);
