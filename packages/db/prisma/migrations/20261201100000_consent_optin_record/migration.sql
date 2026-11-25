-- M-01: where an opt-in came from (form, owner import) and the text the client was shown.
ALTER TYPE "ConsentSource" ADD VALUE 'form';
ALTER TYPE "ConsentSource" ADD VALUE 'owner_import';
ALTER TABLE "consent_events" ADD COLUMN "notice_text" TEXT;
