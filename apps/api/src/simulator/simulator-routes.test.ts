import { dbUsageStore, markedStore } from '@app/ai';
import { createDb } from '@app/db';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';
import { fakeGateway, type Step } from './fake-gateway.ts';
import { SIMULATOR_USAGE_PREFIX } from './simulator-routes.ts';
import { SIMULATOR_TURNS_PER_HOUR } from './turn-limiter.ts';

// Spec 10, "Simulador": a throwaway chat with the configured assistant. A fake model stands
// in for the provider: nothing is billed. Nothing is stored as a conversation or sent.

const PATH = '/api/simulator';
const patient = (text: string) => ({ role: 'patient', text });
const steps: Step[] = [];

const enqueue = vi.fn();
const send = vi.fn();
const store = markedStore(
  dbUsageStore(createDb(process.env.DATABASE_URL ?? '')),
  SIMULATOR_USAGE_PREFIX,
);
const fake = fakeGateway(steps, store);
let ctx: TestContext;

beforeAll(async () => {
  ctx = await startTestApp(undefined, {
    simulatorGateway: fake.gateway,
    enqueueInbound: enqueue,
    send,
  });
});
afterAll(() => ctx.app.close());

const post = (cookie: string, messages: object[]) =>
  ctx.app.inject({ method: 'POST', url: PATH, payload: { messages }, headers: { cookie } });

async function newOwner(setup: { service: string; plan?: 'agenda' }) {
  const cookie = await signUpVerified(ctx);
  const tenantId = await createTenant(ctx, cookie);
  if (setup.plan)
    await ctx.db.client.tenant.update({ where: { id: tenantId }, data: { plan: setup.plan } });
  await ctx.db.withTenant(tenantId, async (tx) => {
    await tx.service.create({
      data: { tenantId, name: setup.service, durationMinutes: 60, priceCents: 18_000 },
    });
    await tx.location.create({
      data: { tenantId, name: 'Sala', address: 'Rua das Flores, 100, Centro' },
    });
  });
  return { cookie, tenantId };
}

describe('POST /api/simulator', () => {
  it('answers with what it used and stores or sends nothing', async () => {
    const { cookie, tenantId } = await newOwner({ service: 'Avaliação inicial' });
    steps.push({ text: 'A avaliação inicial custa R$ 180,00. Fica na Rua das Flores, 100.' });
    const response = await post(cookie, [patient('quanto custa e onde fica?')]);
    expect(response.statusCode).toBe(200);
    const reply = response.json<{ text: string; fixed: boolean; sources: { kind: string }[] }>();
    expect(reply.text).toContain('R$ 180,00');
    expect(reply.fixed).toBe(false);
    expect(reply.sources.map((source) => source.kind)).toEqual(['service', 'address']);

    const counts = await ctx.db.withTenant(tenantId, async (tx) => ({
      conversations: await tx.conversation.count(),
      messages: await tx.message.count(),
      contacts: await tx.contact.count(),
      usage: await tx.aiUsage.findMany(),
    }));
    expect(counts).toMatchObject({ conversations: 0, messages: 0, contacts: 0 });
    expect(counts.usage.length).toBeGreaterThan(0);
    for (const row of counts.usage) {
      expect(row.task.startsWith(`${SIMULATOR_USAGE_PREFIX}:`)).toBe(true);
      expect(row.turnId).toBeNull();
    }
    expect(enqueue).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('shows the tool calls the model made', async () => {
    const { cookie } = await newOwner({ service: 'Sessão', plan: 'agenda' });
    steps.push(
      { tool: 'consultar_horarios', input: { servico: 'Sessão', a_partir_de: '2027-01-04' } },
      { text: 'Não achei horários livres agora; vou pedir ao profissional.' },
    );
    const reply = (await post(cookie, [patient('tem horário?')])).json<{
      sources: { kind: string; detail?: string }[];
    }>();
    expect(reply.sources).toEqual([expect.objectContaining({ kind: 'tool', detail: 'Sessão' })]);
  });

  it('keeps the tenants apart: the prompt only holds the caller data', async () => {
    const a = await newOwner({ service: 'Serviço Alfa' });
    await newOwner({ service: 'Serviço Beta Secreto' });
    steps.push({ text: 'Claro.' });
    fake.prompts.length = 0;
    await post(a.cookie, [patient('oi')]);
    const prompt = JSON.stringify(fake.prompts);
    expect(prompt).toContain('Serviço Alfa');
    expect(prompt).not.toContain('Beta Secreto');
  });

  it('answers an emergency with the fixed message, without calling the model', async () => {
    const { cookie } = await newOwner({ service: 'Avaliação' });
    fake.prompts.length = 0;
    const reply = (await post(cookie, [patient('to com dor no peito')])).json<{
      text: string;
      fixed: boolean;
    }>();
    expect(reply).toMatchObject({ fixed: true });
    expect(reply.text).toContain('SAMU');
    expect(fake.prompts).toHaveLength(0);
  });

  it('refuses a bad body, no session, and a chat that does not end with the patient', async () => {
    const { cookie } = await newOwner({ service: 'Avaliação' });
    expect((await post(cookie, [])).statusCode).toBe(400);
    expect((await post(cookie, [{ role: 'assistant', text: 'oi' }])).statusCode).toBe(400);
    expect((await post('', [patient('oi')])).statusCode).toBe(401);
  });

  it('lets the receptionist run it too, and caps the turns per hour per tenant', async () => {
    const owner = await newOwner({ service: 'Avaliação' });
    const receptionist = await joinAs(ctx, {
      ownerCookie: owner.cookie,
      tenantId: owner.tenantId,
      role: Role.receptionist,
    });
    for (let turn = 0; turn < SIMULATOR_TURNS_PER_HOUR; turn += 1) {
      steps.push({ text: 'Oi!' });
      expect((await post(receptionist, [patient('oi')])).statusCode).toBe(200);
    }
    expect((await post(owner.cookie, [patient('oi')])).statusCode).toBe(429);
    const other = await newOwner({ service: 'Avaliação' });
    steps.push({ text: 'Oi!' });
    expect((await post(other.cookie, [patient('oi')])).statusCode).toBe(200);
  });
});
