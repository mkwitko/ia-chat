-- E-22: confirmation and reminders. Offsets are per tenant (RF-47); `sequence` tells the
-- first reminder (may use a template) from the next (only inside the 24 h window).
ALTER TABLE "tenants" ADD COLUMN "reminder_offsets_minutes" INTEGER[] NOT NULL DEFAULT ARRAY[1440, 120];
ALTER TABLE "scheduled_messages" ADD COLUMN "sequence" INTEGER NOT NULL DEFAULT 0;
DROP INDEX "scheduled_messages_tenant_id_send_at_idx";
CREATE INDEX "scheduled_messages_tenant_id_appointment_id_idx" ON "scheduled_messages"("tenant_id", "appointment_id");
CREATE INDEX "scheduled_messages_tenant_id_state_send_at_idx" ON "scheduled_messages"("tenant_id", "state", "send_at");
