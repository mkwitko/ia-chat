-- M-10: the owner's switch, wait (days) and approved text for the lead follow-up, and the ledger
-- kind that keeps it to one message per conversation. The text is null until the owner confirms it.
ALTER TYPE "ScheduledMessageKind" ADD VALUE 'lead_follow_up';

ALTER TABLE "tenants"
  ADD COLUMN "lead_follow_up" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "lead_follow_up_days" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "lead_follow_up_text" TEXT,
  ADD CONSTRAINT "tenants_lead_follow_up_days_check" CHECK ("lead_follow_up_days" BETWEEN 1 AND 14);
