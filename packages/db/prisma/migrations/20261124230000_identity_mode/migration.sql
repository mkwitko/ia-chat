-- CreateEnum
CREATE TYPE "IdentityMode" AS ENUM ('assistant', 'clinic', 'professional');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "identity_mode" "IdentityMode" NOT NULL DEFAULT 'assistant';

