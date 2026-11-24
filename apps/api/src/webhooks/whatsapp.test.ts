import { createHmac, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  asBody,
  ownerEcho,
  PHONE_NUMBER_ID,
  textMessage,
  twoAccounts,
} from '@app/channels/fixtures';
import { startTestApp, type TestContext } from '../test-support.ts';
import { WHATSAPP_WEBHOOK_PATH } from './whatsapp.ts';

// E-09: RF-20 (signature), RF-21 (raw stored, 200, queued), routing by phone_number_id.

const APP_SECRET = 'segredo-do-app-de-teste';
const VERIFY_TOKEN = 'token-de-verificacao-de-teste';
const queued: { tenantId: string; id: string }[] = [];
let ctx: TestContext;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, {
    env: { META_APP_SECRET: APP_SECRET, META_VERIFY_TOKEN: VERIFY_TOKEN },
    enqueueInbound: (tenant, id) => {
      queued.push({ tenantId: tenant, id });
      return Promise.resolve();
    },
  });
  // A fresh phone_number_id per run: the route table is global.
  const tenant = await ctx.db.client.tenant.create({
    data: { name: 'Webhook (fictício)', slug: `wh-${randomUUID()}` },
  });
  tenantId = tenant.id;
  const channel = await ctx.db.withTenant(tenantId, (tx) =>
    tx.channel.create({ data: { tenantId, kind: 'cloud_api', phoneNumberId: PHONE_NUMBER_ID } }),
  );
  await ctx.db.client.channelRoute.deleteMany({ where: { accountId: PHONE_NUMBER_ID } });
  await ctx.db.client.channelRoute.create({
    data: { accountId: PHONE_NUMBER_ID, tenantId, channelId: channel.id },
  });
});
afterAll(() => ctx.app.close());
beforeEach(() => {
  queued.length = 0;
});

const post = (
  body: Buffer,
  signature = `sha256=${createHmac('sha256', APP_SECRET).update(body).digest('hex')}`,
) =>
  ctx.app.inject({
    method: 'POST',
    url: WHATSAPP_WEBHOOK_PATH,
    payload: body,
    headers: { 'content-type': 'application/json', 'x-hub-signature-256': signature },
  });

const storedEvents = () => ctx.db.withTenant(tenantId, (tx) => tx.inboundEvent.findMany());

describe('WhatsApp Cloud API webhook', () => {
  it('answers the Meta verification challenge only with our token', async () => {
    const ok = await ctx.app.inject({
      method: 'GET',
      url: `${WHATSAPP_WEBHOOK_PATH}?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=4242`,
    });
    expect([ok.statusCode, ok.body]).toEqual([200, '4242']);
    const wrong = await ctx.app.inject({
      method: 'GET',
      url: `${WHATSAPP_WEBHOOK_PATH}?hub.mode=subscribe&hub.verify_token=outro&hub.challenge=4242`,
    });
    expect(wrong.statusCode).toBe(403);
  });

  it('refuses an invalid signature with 401 and stores nothing (RF-20)', async () => {
    const before = (await storedEvents()).length;
    const response = await post(asBody(textMessage), 'sha256=' + '0'.repeat(64));
    expect(response.statusCode).toBe(401);
    expect(await storedEvents()).toHaveLength(before);
    expect(queued).toEqual([]);
  });

  it('stores the raw part under the tenant, answers 200 and queues it once (RF-21)', async () => {
    const body = asBody(ownerEcho);
    const first = await post(body);
    const again = await post(body);
    expect([first.statusCode, again.statusCode]).toEqual([200, 200]);
    const stored = (await storedEvents()).filter((event) =>
      JSON.stringify(event.payload).includes('wamid.ECHO1'),
    );
    expect(stored).toHaveLength(1);
    expect(queued.every((job) => job.tenantId === tenantId && job.id === stored[0]?.id)).toBe(true);
  });

  it('acknowledges accounts with no channel without storing them', async () => {
    const response = await post(asBody(twoAccounts));
    expect(response.statusCode).toBe(200);
    const payloads = JSON.stringify((await storedEvents()).map((event) => event.payload));
    expect(payloads).not.toContain('5511988887777'); // the other number belongs to no tenant here
  });
});
