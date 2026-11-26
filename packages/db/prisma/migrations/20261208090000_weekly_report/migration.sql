-- Research 09 #1/#2: the owner's weekly report (Monday 08:00 local), on by default; the owner
-- turns it off in Mais. Counts only, never a patient name or message content.
ALTER TABLE "tenants" ADD COLUMN "weekly_report" BOOLEAN NOT NULL DEFAULT true;
