-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL DEFAULT uuidv7(),
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "push_subscriptions_tenant_id_user_id_idx" ON "push_subscriptions"("tenant_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_tenant_id_endpoint_key" ON "push_subscriptions"("tenant_id", "endpoint");

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RN-01: tenant isolation.
alter table "push_subscriptions" enable row level security;
alter table "push_subscriptions" force row level security;
create policy tenant_isolation on "push_subscriptions"
  using (tenant_id = app_current_tenant())
  with check (tenant_id = app_current_tenant());
revoke truncate on table "push_subscriptions" from app_runtime;

-- Realtime (SSE, spec 10 "Tempo real"): the inbox wakes up on any change of a conversation,
-- a message or a turn. The payload carries ids only, never content (RN-38).
create function notify_inbox_change() returns trigger language plpgsql as $$
declare
  conversation uuid;
begin
  if tg_table_name = 'conversations' then
    conversation := new.id;
  else
    conversation := new.conversation_id;
  end if;
  perform pg_notify('inbox_changes',
    json_build_object('t', new.tenant_id, 'c', conversation)::text);
  return null;
end $$;

create trigger conversations_inbox_change after insert or update on "conversations"
  for each row execute function notify_inbox_change();
create trigger messages_inbox_change after insert on "messages"
  for each row execute function notify_inbox_change();
create trigger turns_inbox_change after insert or update on "turns"
  for each row execute function notify_inbox_change();
