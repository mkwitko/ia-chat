-- S-01: public waitlist. Platform table (no tenant_id, no RLS): written by the API for anonymous visitors.
CREATE TABLE "waitlist_entries" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "email" TEXT NOT NULL,
    "name" TEXT,
    "specialty" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "waitlist_entries_email_key" ON "waitlist_entries"("email");

-- The app only adds (and removes, when the confirmation email fails); never rewrites an entry.
revoke update, truncate on table "waitlist_entries" from app_runtime;
