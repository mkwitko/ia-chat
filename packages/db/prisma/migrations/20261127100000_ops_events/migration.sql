-- E-26: problems raised by alert() (dead letters, delivery failures, aborted turns) for the operator
-- panel. Platform table (no RLS): ids and a short code only, never message content (RN-38).
CREATE TABLE "ops_events" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "event" TEXT NOT NULL,
    "tenant_id" UUID,
    "queue" TEXT,
    "job_id" TEXT,
    "conversation_id" UUID,
    "turn_id" UUID,
    "code" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ops_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ops_events_created_at_idx" ON "ops_events"("created_at" DESC);

-- The app only appends and reads; it never rewrites or empties the table.
revoke update, truncate on table "ops_events" from app_runtime;
