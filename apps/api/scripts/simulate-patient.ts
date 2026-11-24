// Development only: a fictitious patient writes to the latest seed tenant through the real
// webhook (signed like Meta does), then the conversation is printed.
//   pnpm dev:patient "oi, quanto custa a avaliação?"
//   PATIENT=b pnpm dev:patient "oi"   (another patient)
// Needs the API (with META_APP_SECRET) and the worker running. Never real patient data.
import { createHmac, randomUUID } from 'node:crypto';
import { parseEnv } from '@app/core';
import { createDb } from '@app/db';

const DEFAULT_WAIT_MS = 15_000;
const PHONE_SUFFIX_DIGITS = 5;
const TENANT_ID_PREFIX = 8;
const MS_PER_SECOND = 1000;
const AUTHOR_COLUMN = 8;
const FIRST_ARGUMENT = 2; // after node and the script path
const API_URL = process.env.API_URL ?? 'http://localhost:3100';
const WAIT_MS = Number(process.env.WAIT_MS ?? DEFAULT_WAIT_MS);
const SECRET = process.env.META_APP_SECRET;
// PATIENT=b starts a new fictitious patient (a new conversation).
const suffix = process.env.PATIENT ?? 'a';
const PATIENT = {
  bsuid: `BR.DEV-PACIENTE-${suffix}`,
  phone: `55119999${String(suffix.charCodeAt(0)).padStart(PHONE_SUFFIX_DIGITS, '0')}`,
  name: 'Paciente Teste',
};
const text = process.argv.slice(FIRST_ARGUMENT).join(' ') || 'oi, quanto custa a sessão?';

if (!SECRET) throw new Error('Set META_APP_SECRET (the same one the API uses).');
const db = createDb(parseEnv(process.env).DATABASE_URL);

const tenant = await db.client.tenant.findFirstOrThrow({
  where: { slug: { startsWith: 'seed-' } },
  orderBy: { createdAt: 'desc' },
});
const phoneNumberId = `dev-${tenant.id.slice(0, TENANT_ID_PREFIX)}`;
const channel = await db.withTenant(tenant.id, async (tx) => {
  const found = await tx.channel.findFirstOrThrow({ orderBy: { createdAt: 'asc' } });
  return tx.channel.update({
    where: { id: found.id },
    data: { phoneNumberId, status: 'connected' },
  });
});
await db.client.channelRoute.upsert({
  where: { accountId: phoneNumberId },
  create: { accountId: phoneNumberId, tenantId: tenant.id, channelId: channel.id },
  update: {},
});

const body = JSON.stringify({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: 'dev-waba',
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: '5511900000000', phone_number_id: phoneNumberId },
            contacts: [
              { profile: { name: PATIENT.name }, wa_id: PATIENT.phone, user_id: PATIENT.bsuid },
            ],
            messages: [
              {
                from: PATIENT.phone,
                from_user_id: PATIENT.bsuid,
                id: `wamid.dev.${randomUUID()}`,
                timestamp: String(Math.floor(Date.now() / MS_PER_SECOND)),
                type: 'text',
                text: { body: text },
              },
            ],
          },
        },
      ],
    },
  ],
});
const signature = `sha256=${createHmac('sha256', SECRET).update(body).digest('hex')}`;
const response = await fetch(`${API_URL}/webhooks/whatsapp`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature },
  body,
});
console.log(`webhook: HTTP ${String(response.status)} (tenant ${tenant.name})`);

await new Promise((resolve) => setTimeout(resolve, WAIT_MS));
const messages = await db.withTenant(tenant.id, (tx) =>
  tx.message.findMany({
    where: { conversation: { contact: { bsuid: PATIENT.bsuid } } },
    orderBy: { createdAt: 'asc' },
    take: 20,
  }),
);
for (const message of messages)
  console.log(message.author.padEnd(AUTHOR_COLUMN), message.text ?? '[' + message.type + ']');
const turns = await db.withTenant(tenant.id, (tx) =>
  tx.turn.findMany({ orderBy: { startedAt: 'desc' }, take: 1 }),
);
console.log('last turn:', turns[0] ? `${turns[0].state} ${turns[0].model ?? ''}` : 'none');
await db.client.$disconnect();
