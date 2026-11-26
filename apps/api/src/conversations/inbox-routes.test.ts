import { randomUUID } from 'node:crypto';
import type { ChannelSend } from '@app/channels';
import { MessageAuthor, MessageDirection, MessageStatus, MessageType, TurnState } from '@app/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTenant,
  newConversation,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// E-16 and E-18b: the inbox API, and drafts approved under the send lock.

const sentTexts: string[] = [];
let failNext = false;
const send: ChannelSend = (_tx, { text }) => {
  if (failNext) {
    failNext = false;
    return Promise.reject(new Error('canal fora do ar'));
  }
  sentTexts.push(text);
  return Promise.resolve({ providerMessageId: `wamid.out.${randomUUID()}` });
};

let ctx: TestContext;
let cookie: string;
let tenantId: string;
let otherCookie: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, { send });
  cookie = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, cookie);
  otherCookie = await signUpVerified(ctx);
  await createTenant(ctx, otherCookie);
});
afterAll(() => ctx.app.close());

const get = (url: string, session = cookie) =>
  ctx.app.inject({ method: 'GET', url, headers: { cookie: session } });
const post = (url: string, payload: object, session = cookie) =>
  ctx.app.inject({ method: 'POST', url, payload, headers: { cookie: session } });

async function patientSays(conversationId: string, text: string): Promise<void> {
  await ctx.db.withTenant(tenantId, async (tx) => {
    const conversation = await tx.conversation.update({
      where: { id: conversationId },
      data: { unreadCount: { increment: 1 }, lastMessageAt: new Date() },
    });
    await tx.message.create({
      data: {
        tenantId,
        channelId: conversation.channelId,
        conversationId,
        direction: MessageDirection.inbound,
        author: MessageAuthor.patient,
        type: MessageType.text,
        text,
        status: MessageStatus.received,
      },
    });
  });
}

/** A draft written for the conversation's current turn_version. */
async function draftFor(conversationId: string, text = 'Posso ajudar com isso.') {
  return ctx.db.withTenant(tenantId, async (tx) => {
    const { turnVersion } = await tx.conversation.findUniqueOrThrow({
      where: { id: conversationId },
    });
    const turn = await tx.turn.create({
      data: {
        tenantId,
        conversationId,
        version: turnVersion,
        state: TurnState.draft,
        draftText: text,
      },
    });
    return turn.id;
  });
}

interface Detail {
  control: string;
  state: string;
  unreadCount: number;
  draft: object | null;
  messages: { author: string; text: string | null; redacted: boolean }[];
}

const detail = async (id: string) => (await get(`/api/conversations/${id}`)).json<Detail>();
const draftCall = (id: string, body: object) => post(`/api/conversations/${id}/draft`, body);

describe('list and detail', () => {
  it('puts the conversations that need the professional first, with the state in words', async () => {
    const withAssistant = await newConversation(ctx, tenantId);
    await patientSays(withAssistant, 'oi');
    const waiting = await newConversation(ctx, tenantId);
    await patientSays(waiting, 'preciso falar com você');
    await post(`/api/conversations/${waiting}/control`, { to: 'human' });
    const list = (await get('/api/conversations')).json<{ id: string; state: string }[]>();
    const states = Object.fromEntries(list.map((item) => [item.id, item.state]));
    expect(states[waiting]).toBe('needs_you');
    expect(states[withAssistant]).toBe('assistant');
    expect(list.findIndex((i) => i.id === waiting)).toBeLessThan(
      list.findIndex((i) => i.id === withAssistant),
    );
  });

  it('shows the authorship of each message and clears unread on read', async () => {
    const id = await newConversation(ctx, tenantId);
    await patientSays(id, 'bom dia');
    await post(`/api/conversations/${id}/messages`, { text: 'Bom dia!' });
    const body = await detail(id);
    expect(body.messages.map((m) => m.author)).toEqual(['patient', 'professional']);
    await post(`/api/conversations/${id}/read`, {});
    expect((await detail(id)).unreadCount).toBe(0);
  });

  it('flags a message erased by the retention policy (H-34) without its text', async () => {
    const id = await newConversation(ctx, tenantId);
    await patientSays(id, 'texto fictício');
    await ctx.db.withTenant(tenantId, (tx) =>
      tx.message.updateMany({
        where: { conversationId: id },
        data: { text: null, redactedAt: new Date() },
      }),
    );
    const body = await detail(id);
    expect(body.messages[0]?.redacted).toBe(true);
    const list = (await get('/api/conversations')).json<
      { id: string; lastMessage: { redacted: boolean } | null }[]
    >();
    expect(list.find((item) => item.id === id)?.lastMessage?.redacted).toBe(true);
  });

  it('does not show another tenant conversation', async () => {
    const id = await newConversation(ctx, tenantId);
    expect((await get(`/api/conversations/${id}`, otherCookie)).statusCode).toBe(404);
    expect(
      (await post(`/api/conversations/${id}/messages`, { text: 'oi' }, otherCookie)).statusCode,
    ).toBe(404);
    const list = (await get('/api/conversations', otherCookie)).json<{ id: string }[]>();
    expect(list.map((item) => item.id)).not.toContain(id);
  });
});

describe('sending from the panel', () => {
  it('takes the conversation over and records the message as the professional', async () => {
    const id = await newConversation(ctx, tenantId);
    const response = await post(`/api/conversations/${id}/messages`, { text: 'Olá, tudo bem?' });
    expect(response.statusCode).toBe(200);
    expect(sentTexts).toContain('Olá, tudo bem?');
    expect((await detail(id)).control).toBe('human');
  });

  it('a channel failure rolls everything back and says so', async () => {
    const id = await newConversation(ctx, tenantId);
    failNext = true;
    const response = await post(`/api/conversations/${id}/messages`, { text: 'não vai' });
    expect(response.statusCode).toBe(502);
    const body = await detail(id);
    expect(body.messages).toHaveLength(0);
    expect(body.control).toBe('ai');
  });
});

describe('draft approval (RF-13) under the send lock', () => {
  it('approve sends the draft as it is, as the assistant', async () => {
    const id = await newConversation(ctx, tenantId);
    const turnId = await draftFor(id, 'Atendemos de segunda a sexta.');
    expect((await detail(id)).state).toBe('awaiting_approval');
    expect((await draftCall(id, { action: 'approve', turnId })).statusCode).toBe(200);
    const after = await detail(id);
    expect(after.draft).toBeNull();
    expect(after.messages.at(-1)).toMatchObject({
      author: 'assistant',
      text: 'Atendemos de segunda a sexta.',
    });
    expect(after.control).toBe('ai');
  });

  it('edit sends the professional text, as the professional', async () => {
    const id = await newConversation(ctx, tenantId);
    const turnId = await draftFor(id);
    await draftCall(id, { action: 'edit', turnId, text: 'Versão corrigida.' });
    expect((await detail(id)).messages.at(-1)).toMatchObject({
      author: 'professional',
      text: 'Versão corrigida.',
    });
  });

  it('edit without text is refused', async () => {
    const id = await newConversation(ctx, tenantId);
    const turnId = await draftFor(id);
    expect((await draftCall(id, { action: 'edit', turnId })).statusCode).toBe(400);
  });

  it('discard sends nothing and clears the draft', async () => {
    const id = await newConversation(ctx, tenantId);
    const turnId = await draftFor(id);
    await draftCall(id, { action: 'discard', turnId });
    const after = await detail(id);
    expect(after.draft).toBeNull();
    expect(after.messages).toHaveLength(0);
  });

  it('refuses a stale draft after a new patient message (turn_version moved)', async () => {
    const id = await newConversation(ctx, tenantId);
    const turnId = await draftFor(id);
    await ctx.db.withTenant(tenantId, (tx) =>
      tx.conversation.update({ where: { id }, data: { turnVersion: { increment: 1 } } }),
    );
    const before = sentTexts.length;
    const response = await draftCall(id, { action: 'approve', turnId });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'stale_draft' });
    expect(sentTexts).toHaveLength(before);
  });

  it('refuses a draft once the professional took over', async () => {
    const id = await newConversation(ctx, tenantId);
    const turnId = await draftFor(id);
    await post(`/api/conversations/${id}/control`, { to: 'human' });
    expect((await draftCall(id, { action: 'approve', turnId })).statusCode).toBe(409);
  });

  it('two taps at once send once', async () => {
    const id = await newConversation(ctx, tenantId);
    const turnId = await draftFor(id, 'Só uma vez.');
    const before = sentTexts.length;
    const results = await Promise.all([
      draftCall(id, { action: 'approve', turnId }),
      draftCall(id, { action: 'approve', turnId }),
    ]);
    expect(results.map((r) => r.statusCode).toSorted((a, b) => a - b)).toEqual([200, 409]);
    expect(sentTexts).toHaveLength(before + 1);
  });
});
