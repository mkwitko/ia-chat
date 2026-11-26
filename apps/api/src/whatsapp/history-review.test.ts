import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { HistoryImportState, MessageType } from '@app/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';
import { recentPatientQuestions } from './history-faq.ts';

// E-24b: the owner reviews the staged history and brings only the chosen contacts and messages.

const REVIEW = '/api/whatsapp/history-import/review';
const ENV = {
  META_APP_ID: '1234',
  META_APP_SECRET: 'app-secret',
  META_ES_CONFIG_ID: '5678',
  META_TOKEN_KEY: randomBytes(32).toString('base64'),
};
const AT = new Date('2027-01-02T12:00:00Z');
const PREVIEW_LIMIT = 5;
const MANY = 8;

let ctx: TestContext;
let owner: string;
let tenantId: string;
let channelId: string;

const digits = () => String(randomInt(1e9, 9e9));
const phoneNumberId = digits();
const json = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const fakeGraph: typeof fetch = (url) => {
  const target = url instanceof Request ? url.url : url.toString();
  if (target.includes('/oauth/access_token')) return Promise.resolve(json({ access_token: 't' }));
  if (target.includes('/phone_numbers'))
    return Promise.resolve(json({ data: [{ id: phoneNumberId }] }));
  if (target.includes('?fields=primary_funding_id'))
    return Promise.resolve(json({ primary_funding_id: '9' }));
  if (target.includes('/message_templates?')) return Promise.resolve(json({ data: [] }));
  return Promise.resolve(json({ success: true }));
};

beforeAll(async () => {
  ctx = await startTestApp(undefined, { metaFetch: fakeGraph, env: ENV });
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
  await ctx.app.inject({
    method: 'POST',
    url: '/api/whatsapp/connect',
    headers: { cookie: owner },
    payload: { code: 'c', wabaId: '777', phoneNumberId, coexistence: true },
  });
  const channel = await ctx.db.withTenant(tenantId, (tx) =>
    tx.channel.findFirstOrThrow({ where: { coexistence: true } }),
  );
  channelId = channel.id;
});
afterAll(() => ctx.app.close());

async function stage(messages: number, name = 'Cliente Fictício') {
  return ctx.db.withTenant(tenantId, async (tx) => {
    const contact = await tx.importContact.create({
      data: {
        tenantId,
        channelId,
        key: `+55419${digits()}`,
        phoneE164: `+55419${digits()}`,
        name,
        messageCount: messages,
        firstMessageAt: AT,
        lastMessageAt: new Date(AT.getTime() + messages * 1000),
      },
    });
    for (let index = 0; index < messages; index += 1)
      await tx.importMessage.create({
        data: {
          tenantId,
          importContactId: contact.id,
          providerMessageId: `wamid.${randomUUID()}`,
          fromOwner: index % 2 === 1,
          type: MessageType.text,
          text: `mensagem fictícia ${String(index)}`,
          at: new Date(AT.getTime() + index * 1000),
        },
      });
    return contact.id;
  });
}

const setState = (historyImport: HistoryImportState) =>
  ctx.db.withTenant(tenantId, (tx) =>
    tx.channel.update({
      where: { id: channelId },
      data: { historyImport, historyReviewedAt: null },
    }),
  );
const clear = () =>
  ctx.db.withTenant(tenantId, async (tx) => {
    await tx.importContact.deleteMany({});
    await tx.message.deleteMany({});
    await tx.conversation.deleteMany({});
    await tx.contact.deleteMany({});
  });
interface Call {
  method: 'GET' | 'POST';
  url: string;
  payload?: object;
}
const callAs = (cookie: string, { method, url, payload }: Call) =>
  ctx.app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });
const call = (method: 'GET' | 'POST', url: string, payload?: object) =>
  callAs(owner, { method, url, ...(payload ? { payload } : {}) });
const confirm = (selections: object[]) => call('POST', `${REVIEW}/confirm`, { selections });

describe('history import review', () => {
  it('lists staged contacts with counts and dates, never message text', async () => {
    await clear();
    await setState(HistoryImportState.done);
    await stage(3);
    const response = await call('GET', REVIEW);
    const { contacts } = response.json<{ contacts: Record<string, unknown>[] }>();
    expect(contacts).toHaveLength(1);
    expect(contacts[0]).toMatchObject({ name: 'Cliente Fictício', messageCount: 3 });
    expect(contacts[0]).toHaveProperty('lastMessageAt');
    expect(response.body).not.toContain('mensagem fictícia');
  });

  it('previews the last few messages of one contact, oldest first', async () => {
    await clear();
    const id = await stage(MANY);
    const response = await call('GET', `${REVIEW}/${id}/messages`);
    const { messages } = response.json<{ messages: { text: string }[] }>();
    expect(messages).toHaveLength(PREVIEW_LIMIT);
    expect(messages.at(-1)?.text).toBe(`mensagem fictícia ${String(MANY - 1)}`);
    expect(messages[0]?.text).toBe(`mensagem fictícia ${String(MANY - PREVIEW_LIMIT)}`);
  });

  it('adds nothing to Clientes before the owner confirms', async () => {
    await clear();
    await stage(2);
    await call('GET', REVIEW);
    await ctx.db.withTenant(tenantId, async (tx) => {
      expect(await tx.contact.count()).toBe(0);
      expect(await tx.message.count({ where: { imported: true } })).toBe(0);
    });
  });

  it('imports only the selected contacts and messages, and deletes the rest', async () => {
    await clear();
    await setState(HistoryImportState.done);
    const withMessages = await stage(2, 'Com mensagens');
    const clientOnly = await stage(2, 'Só cliente');
    await stage(2, 'Não selecionado');
    const response = await confirm([
      { id: withMessages, messages: true },
      { id: clientOnly, messages: false },
    ]);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ clients: 2, messages: 2 });
    await ctx.db.withTenant(tenantId, async (tx) => {
      const names = (await tx.contact.findMany())
        .map((one) => one.name ?? '')
        .toSorted((a, b) => a.localeCompare(b));
      expect(names).toEqual(['Com mensagens', 'Só cliente']);
      expect(await tx.message.count({ where: { imported: true } })).toBe(2);
      expect(await tx.importContact.count()).toBe(0);
      expect(await tx.importMessage.count()).toBe(0);
    });
  });

  it('keeps imported messages out of the assistant, and staged ones out of the FAQ', async () => {
    await clear();
    await stage(2);
    const staged = await ctx.db.withTenant(tenantId, (tx) => recentPatientQuestions(tx));
    expect(staged).toEqual([]);
  });

  it('discards everything staged without creating any client', async () => {
    await clear();
    await setState(HistoryImportState.done);
    await stage(2);
    await stage(1);
    expect((await call('POST', `${REVIEW}/discard`, {})).statusCode).toBe(200);
    await ctx.db.withTenant(tenantId, async (tx) => {
      expect(await tx.importContact.count()).toBe(0);
      expect(await tx.importMessage.count()).toBe(0);
      expect(await tx.contact.count()).toBe(0);
    });
  });

  it('waits for the history to finish before confirming or discarding', async () => {
    await clear();
    await setState(HistoryImportState.requested);
    const id = await stage(1);
    expect((await confirm([{ id, messages: false }])).statusCode).toBe(409);
    expect((await call('POST', `${REVIEW}/discard`, {})).statusCode).toBe(409);
    await ctx.db.withTenant(tenantId, async (tx) => {
      expect(await tx.importContact.count()).toBe(1);
    });
  });

  it('is the owner only and validates the body', async () => {
    await clear();
    await setState(HistoryImportState.done);
    const id = await stage(1);
    const professional = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.professional,
    });
    for (const [method, url] of [
      ['GET', REVIEW],
      ['GET', `${REVIEW}/${id}/messages`],
      ['POST', `${REVIEW}/confirm`],
      ['POST', `${REVIEW}/discard`],
    ] as const)
      expect((await callAs(professional, { method, url, payload: {} })).statusCode).toBe(403);
    expect(
      (await call('POST', `${REVIEW}/confirm`, { selections: [{ id: 'x' }] })).statusCode,
    ).toBe(400);
    expect((await call('GET', `${REVIEW}/nao-e-uuid/messages`)).statusCode).toBe(404);
  });
});
