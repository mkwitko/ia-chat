-- Owner decision (25/11/2026): account creation is invite-only. The operator creates a single-use
-- onboarding invite; only the SHA-256 of its token is stored. Platform table (no tenant_id, no RLS).
CREATE TYPE "InviteStatus" AS ENUM ('pending', 'used', 'cancelled');

CREATE TABLE "onboarding_invites" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "token_hash" TEXT NOT NULL,
    "practice_name" TEXT NOT NULL,
    "email" TEXT,
    "status" "InviteStatus" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_by_id" UUID NOT NULL,
    "updated_by_id" UUID,
    "used_at" TIMESTAMPTZ,
    "used_by_user_id" UUID,
    "tenant_id" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "onboarding_invites_token_hash_key" ON "onboarding_invites"("token_hash");
CREATE INDEX "onboarding_invites_created_at_idx" ON "onboarding_invites"("created_at" DESC);

-- The app never empties the table: a used or cancelled invite stays as the record of who got access.
revoke truncate on table "onboarding_invites" from app_runtime;

-- An invited tenant waits in "setup" (no trial clock) until its WhatsApp connects (H-24).
ALTER TYPE "TenantStatus" ADD VALUE IF NOT EXISTS 'setup' BEFORE 'trial';

-- H-24: the 14-day trial starts when a channel of a tenant in "setup" first becomes connected,
-- whatever adapter connected it (Embedded Signup, QR code). One place, in SQL, for every path.
CREATE FUNCTION start_trial_on_connect() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'connected' THEN
    UPDATE "tenants"
       SET "status" = 'trial', "trial_ends_at" = now() + interval '14 days'
     WHERE "id" = NEW.tenant_id AND "status"::text = 'setup';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER "channels_start_trial"
  AFTER INSERT OR UPDATE OF "status" ON "channels"
  FOR EACH ROW EXECUTE FUNCTION start_trial_on_connect();
