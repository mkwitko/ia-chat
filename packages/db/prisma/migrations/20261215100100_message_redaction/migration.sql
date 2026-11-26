-- H-34: the retention job nulls `text` and `media` of messages past the retention period and stamps
-- `redacted_at`, so the panel can say why the message is empty.

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "redacted_at" TIMESTAMPTZ;
