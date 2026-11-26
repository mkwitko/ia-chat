import type { AiGateway } from '@app/ai';
import { MessageAuthor, MessageDirection, MessageStatus } from '@app/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, signUpVerified, startTestApp, type TestContext } from '../test-support.ts';

// E-24b: "IA sugere" over the imported history. The gateway is a stub: no paid calls.

const HEALTH_WORD = 'dor';
const SUGGESTIONS = '/api/whatsapp/history-import/suggestions';

const extracted: string[] = [];
let modelInput = '';
const stub = {
  judge: (_scope: unknown, request: { state: { mensagem: string } }) =>
    Promise.resolve({
      health: {
        kind: 'noul',
        probability: request.state.mensagem.includes(HEALTH_WORD) ? 0.99 : 0.01,
      },
    }),
  extract: (request: { input: string }) => {
    modelInput = request.input;
    return Promise.resolve({ questions: extracted });
  },
};
const gateway = stub as unknown as AiGateway;

let ctx: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, { simulatorGateway: gateway });
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
  await ctx.db.withTenant(tenantId, async (tx) => {
    const channel = await tx.channel.create({ data: { tenantId, kind: 'cloud_api' } });
    const contact = await tx.contact.create({
      data: { tenantId, name: 'Fictícia', bsuid: 'BR.FAQ1' },
    });
    const conversation = await tx.conversation.create({
      data: { tenantId, channelId: channel.id, contactId: contact.id },
    });
    const texts = [
      'Vocês atendem aos sábados?',
      'Qual o endereço do consultório?',
      'Aceitam convênio ou só particular?',
      'Estou com muita dor nas costas há uma semana',
    ];
    await tx.message.createMany({
      data: texts.map((text, index) => ({
        tenantId,
        channelId: channel.id,
        conversationId: conversation.id,
        direction: MessageDirection.inbound,
        author: MessageAuthor.patient,
        type: 'text' as const,
        text,
        status: MessageStatus.received,
        providerMessageId: `wamid.FAQ${String(index)}`,
        imported: true,
      })),
    });
  });
});
afterAll(() => ctx.app.close());

const suggest = () =>
  ctx.app.inject({ method: 'POST', url: SUGGESTIONS, headers: { cookie: owner }, payload: {} });

describe('history FAQ suggestions', () => {
  it('never sends a health message to the model and saves only health-free questions', async () => {
    extracted.push('Vocês atendem aos sábados?', 'Como lidar com a dor lombar?');
    const response = await suggest();
    expect(response.json()).toEqual({ added: 1 });
    expect(modelInput).toContain('sábados');
    expect(modelInput).not.toContain(HEALTH_WORD);
    const pending = await ctx.db.withTenant(tenantId, (tx) =>
      tx.knowledgeItem.findMany({ where: { source: 'history' } }),
    );
    expect(pending).toMatchObject([
      { question: 'Vocês atendem aos sábados?', answer: null, active: false },
    ]);
  });

  it('does not add a question twice', async () => {
    expect((await suggest()).json()).toEqual({ added: 0 });
  });
});

describe('without a model gateway', () => {
  it('is off', async () => {
    const off = await startTestApp();
    const cookie = await signUpVerified(off);
    await createTenant(off, cookie);
    const response = await off.app.inject({
      method: 'POST',
      url: SUGGESTIONS,
      headers: { cookie },
      payload: {},
    });
    expect(response.statusCode).toBe(503);
    await off.app.close();
  });
});
