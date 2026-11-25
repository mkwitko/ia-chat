-- E-24: "Conectar WhatsApp" by Embedded Signup. Each client's business token (encrypted), the
-- registration PIN (encrypted) and which setup steps already went through at Meta (resumable).
ALTER TABLE "channels" ADD COLUMN "access_token_enc" TEXT;
ALTER TABLE "channels" ADD COLUMN "register_pin_enc" TEXT;
ALTER TABLE "channels" ADD COLUMN "setup_done" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "channels" ADD COLUMN "setup_error" TEXT;
