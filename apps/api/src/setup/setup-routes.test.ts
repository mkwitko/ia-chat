import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// E-17: services, address, knowledge base and tone of voice. Audited; receptionist reads only.

const EVALUATION = {
  name: 'Avaliação',
  durationMinutes: 60,
  priceCents: 18000,
  visibleToPatient: true,
};
const TONE = {
  professionalName: 'Dr. Rafael Teste',
  answers: {
    formality: 'informal',
    emoji: 'sometimes',
    greeting: 'Oi, tudo bem?',
    farewell: 'Abraço!',
  },
  examples: ['Oi! Tenho horário amanhã às 15h, serve?'],
};

let ctx: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
});
afterAll(() => ctx.app.close());

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
interface CallOptions {
  payload?: object;
  cookie?: string;
}
const call = (method: Method, url: string, { payload, cookie = owner }: CallOptions = {}) =>
  ctx.app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

const audits = (entity: string) =>
  ctx.db.withTenant(tenantId, (tx) => tx.auditLog.findMany({ where: { entity } }));

describe('services', () => {
  it('creates, lists, edits and archives, with audit', async () => {
    const created = await call('POST', '/api/services', { payload: EVALUATION });
    expect(created.statusCode).toBe(201);
    const { id } = created.json<{ id: string }>();
    await call('PUT', `/api/services/${id}`, { payload: { ...EVALUATION, priceCents: 20000 } });
    expect((await call('GET', '/api/services')).json()).toEqual({
      pricesForbidden: false,
      services: [{ id, ...EVALUATION, priceCents: 20000 }],
    });
    expect((await call('DELETE', `/api/services/${id}`)).statusCode).toBe(200);
    expect((await call('GET', '/api/services')).json<{ services: [] }>().services).toEqual([]);
    expect((await audits('service')).map((entry) => entry.action)).toEqual([
      'create',
      'update',
      'archive',
    ]);
  });

  it('refuses invalid values and other tenants', async () => {
    expect(
      (await call('POST', '/api/services', { payload: { ...EVALUATION, priceCents: -1 } }))
        .statusCode,
    ).toBe(400);
    const other = await signUpVerified(ctx);
    await createTenant(ctx, other);
    const { id } = (await call('POST', '/api/services', { payload: EVALUATION })).json<{
      id: string;
    }>();
    expect(
      (await call('PUT', `/api/services/${id}`, { payload: EVALUATION, cookie: other })).statusCode,
    ).toBe(404);
  });

  it('lets the receptionist read but not change', async () => {
    const receptionist = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.receptionist,
    });
    expect((await call('GET', '/api/services', { cookie: receptionist })).statusCode).toBe(200);
    expect(
      (await call('POST', '/api/services', { payload: EVALUATION, cookie: receptionist }))
        .statusCode,
    ).toBe(403);
  });
});

describe('location', () => {
  it('starts empty and saves the address and arrival instructions', async () => {
    expect((await call('GET', '/api/location')).json()).toEqual({ location: null });
    const body = {
      address: 'Rua Fictícia, 100, sala 2',
      arrivalInstructions: 'Toque o interfone 2.',
    };
    await call('PUT', '/api/location', { payload: body });
    await call('PUT', '/api/location', { payload: { ...body, arrivalInstructions: null } });
    expect((await call('GET', '/api/location')).json()).toEqual({
      location: { ...body, arrivalInstructions: null },
    });
  });
});

describe('knowledge base', () => {
  it('creates and lists a manual item', async () => {
    const manual = await call('POST', '/api/knowledge', {
      payload: { question: 'Aceita cartão?', answer: 'Sim, débito e crédito.' },
    });
    expect(manual.statusCode).toBe(201);
    const view = (await call('GET', '/api/knowledge')).json<{ items: { answer: string }[] }>();
    expect(view.items.map((item) => item.answer)).toEqual(['Sim, débito e crédito.']);
  });

  it('refuses an empty answer', async () => {
    expect(
      (await call('POST', '/api/knowledge', { payload: { question: 'Oi?', answer: ' ' } }))
        .statusCode,
    ).toBe(400);
  });
});

describe('tone of voice', () => {
  it('saves the four answers, the examples and derives the tone text', async () => {
    expect((await call('PUT', '/api/tone', { payload: TONE })).statusCode).toBe(200);
    expect((await call('GET', '/api/tone')).json()).toEqual(TONE);
    const professional = await ctx.db.withTenant(tenantId, (tx) =>
      tx.professional.findFirstOrThrow(),
    );
    expect(professional.name).toBe(TONE.professionalName);
    expect(professional.toneOfVoice).toContain('Oi, tudo bem?');
  });
});
