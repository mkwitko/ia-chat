import { dbUsageStore } from '@app/ai';
import { createDb, KnowledgeSource } from '@app/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import { fakeGateway, type Step } from '../simulator/fake-gateway.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';
import { PROFILE_NOTE } from './faq-suggestion.ts';

// Spec 10, "Assistente": unanswered questions grouped, approved into the base or dismissed.

const BASE = '/api/knowledge/unanswered';
const steps: Step[] = [];
let ctx: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  const store = dbUsageStore(createDb(process.env.DATABASE_URL ?? ''));
  ctx = await startTestApp(undefined, { simulatorGateway: fakeGateway(steps, store).gateway });
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
});
afterAll(() => ctx.app.close());

const post = (url: string, payload: object, cookie = owner) =>
  ctx.app.inject({ method: 'POST', url, headers: { cookie }, payload });
const view = async () =>
  (
    await ctx.app.inject({ method: 'GET', url: '/api/knowledge', headers: { cookie: owner } })
  ).json<{
    items: { id: string; question: string; answer: string }[];
    unanswered: { ids: string[]; question: string; count: number }[];
  }>();
const ask = (question: string) =>
  ctx.db.withTenant(tenantId, (tx) =>
    tx.knowledgeItem.create({
      data: { tenantId, question, source: KnowledgeSource.unanswered, active: false },
    }),
  );

describe('unanswered questions', () => {
  it('folds repeated questions, then approval keeps one active item and drops the copies', async () => {
    const [a, b] = [await ask('Tem estacionamento?'), await ask('tem estacionamento')];
    await ask('Atende criança?');
    const before = await view();
    expect(before.unanswered.map((group) => group.count)).toEqual([2, 1]);
    expect(before.items).toEqual([]);
    const approved = await post(`${BASE}/approve`, {
      ids: [a.id, b.id],
      question: 'Tem estacionamento?',
      answer: 'Sim, na rua em frente.',
    });
    expect(approved.statusCode).toBe(200);
    const after = await view();
    expect(after.items).toMatchObject([{ answer: 'Sim, na rua em frente.' }]);
    expect(after.unanswered.map((group) => group.question)).toEqual(['Atende criança?']);
  });

  it('refuses an empty answer and an id that is not pending', async () => {
    const pending = await ask('Aceita convênio?');
    const empty = await post(`${BASE}/approve`, {
      ids: [pending.id],
      question: 'Aceita convênio?',
      answer: '  ',
    });
    expect(empty.statusCode).toBe(400);
    const { items } = await view();
    const active = items[0];
    const answered = await post(`${BASE}/approve`, {
      ids: [active?.id],
      question: 'x',
      answer: 'y',
    });
    expect(answered.statusCode).toBe(404);
  });

  it('dismisses a whole group', async () => {
    const rows = [await ask('Vende produto?'), await ask('vende produtos')];
    const dismissed = await post(`${BASE}/dismiss`, { ids: rows.map((row) => row.id) });
    expect(dismissed.statusCode).toBe(200);
    expect((await view()).unanswered.map((group) => group.question)).not.toContain(
      'Vende produto?',
    );
  });

  it('suggests a draft and replaces one that states a price', async () => {
    steps.push({ text: JSON.stringify({ answer: 'Sim, aceitamos Pix e cartão.' }) });
    const plain = await post(`${BASE}/suggest`, { question: 'Aceita Pix?' });
    expect(plain.json()).toEqual({ suggestion: 'Sim, aceitamos Pix e cartão.' });
    steps.push({ text: JSON.stringify({ answer: 'A consulta custa R$ 250.' }) });
    const priced = await post(`${BASE}/suggest`, { question: 'Quanto custa?' });
    expect(priced.json()).toEqual({ suggestion: PROFILE_NOTE });
  });

  it('is for the owner: a receptionist can not approve, dismiss or ask for a draft', async () => {
    const pending = await ask('Pergunta da recepção?');
    const receptionist = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.receptionist,
    });
    const body = { ids: [pending.id], question: 'q', answer: 'a' };
    expect((await post(`${BASE}/approve`, body, receptionist)).statusCode).toBe(403);
    expect((await post(`${BASE}/dismiss`, { ids: body.ids }, receptionist)).statusCode).toBe(403);
    expect((await post(`${BASE}/suggest`, { question: 'q' }, receptionist)).statusCode).toBe(403);
  });
});
