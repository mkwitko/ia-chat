-- E-24b: coexistence history import. Channel state of the import, and a flag on messages that came
-- from it (read-only context: the assistant never reads them).

-- CreateEnum
CREATE TYPE "HistoryImportState" AS ENUM ('none', 'offered', 'requested', 'declined', 'unavailable', 'done');

-- AlterTable
ALTER TABLE "channels" ADD COLUMN     "history_import" "HistoryImportState" NOT NULL DEFAULT 'none',
ADD COLUMN     "onboarded_at" TIMESTAMPTZ,
ADD COLUMN     "history_authorized_at" TIMESTAMPTZ,
ADD COLUMN     "history_progress" INTEGER;

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "imported" BOOLEAN NOT NULL DEFAULT false;
