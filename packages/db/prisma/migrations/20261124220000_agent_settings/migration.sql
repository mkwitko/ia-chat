-- CreateEnum
CREATE TYPE "Autonomy" AS ENUM ('auto', 'approve', 'off');

-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "summary" TEXT,
ADD COLUMN     "summary_until" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "assistant_name" TEXT NOT NULL DEFAULT 'Assistente virtual',
ADD COLUMN     "autonomy" "Autonomy" NOT NULL DEFAULT 'approve';

-- AlterTable
ALTER TABLE "turns" ADD COLUMN     "draft_text" TEXT;

