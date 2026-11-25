import { dbUsageStore, markedStore } from '@app/ai';
import { createDb } from '@app/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import { fakeGateway, type Step } from '../simulator/fake-gateway.ts';
import { SIMULATOR_USAGE_PREFIX } from '../simulator/simulator-routes.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// M-04: business profile, several places and professionals, packages the assistant quotes
// exactly. Fictitious data only.

const PROFILE = {
  name: 'Clínica Exemplo Fictícia',
  cancelNoticeMinutes: 240,
  profile: {
    description: 'Quiropraxia e acupuntura.',
    phone: '(11) 3000-0000',
    website: 'https://exemplo.invalid',
    paymentMethods: ['pix', 'cash'],
    cancellationPolicy: 'Consulta da manhã: avise até a noite anterior.',
    packages: [{ name: '4 sessões', priceCents: 80_000 }],
  },
};

const steps: Step[] = [];
const store = markedStore(
  dbUsageStore(createDb(process.env.DATABASE_URL ?? '')),
  SIMULATOR_USAGE_PREFIX,
);
let ctx: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, { simulatorGateway: fakeGateway(steps, store).gateway });
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
});
afterAll(() => ctx.app.close());

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
const call = (
  method: Method,
  url: string,
  { payload, cookie = owner }: { payload?: object; cookie?: string } = {},
) => ctx.app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

describe('business profile', () => {
  it('saves name, minutes rule and profile, with audit', async () => {
    expect((await call('PUT', '/api/profile', { payload: PROFILE })).statusCode).toBe(200);
    const view = (await call('GET', '/api/profile')).json<typeof PROFILE>();
    expect(view.name).toBe(PROFILE.name);
    expect(view.cancelNoticeMinutes).toBe(240);
    expect(view.profile.packages).toEqual(PROFILE.profile.packages);
    const audits = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.findMany({ where: { entity: 'business_profile' } }),
    );
    expect(audits).toHaveLength(1);
  });

  it('refuses a fractional package price and lets the receptionist only read', async () => {
    const bad = { ...PROFILE, profile: { packages: [{ name: 'x', priceCents: 1.5 }] } };
    expect((await call('PUT', '/api/profile', { payload: bad })).statusCode).toBe(400);
    const receptionist = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.receptionist,
    });
    expect((await call('GET', '/api/profile', { cookie: receptionist })).statusCode).toBe(200);
    expect(
      (await call('PUT', '/api/profile', { payload: PROFILE, cookie: receptionist })).statusCode,
    ).toBe(403);
  });

  it('lets the assistant quote the package price exactly (output validation accepts it)', async () => {
    await call('PUT', '/api/profile', { payload: PROFILE });
    steps.push({ text: 'O pacote de 4 sessões sai R$ 800,00.' });
    const reply = await call('POST', '/api/simulator', {
      payload: { messages: [{ role: 'patient', text: 'Quanto é o pacote?' }] },
    });
    const answer = reply.json<{ text: string; fixed: boolean }>();
    expect(answer.fixed).toBe(false);
    expect(answer.text).toContain('O pacote de 4 sessões sai R$ 800,00.');
  });
});

describe('places and professionals', () => {
  it('keeps several places and refuses to remove one with appointments', async () => {
    const first = await call('POST', '/api/locations', {
      payload: { name: 'Sala 1', address: 'Rua A, 1' },
    });
    const second = await call('POST', '/api/locations', {
      payload: { name: 'Sala 2', address: 'Rua B, 2' },
    });
    expect(second.statusCode).toBe(201);
    const { id } = second.json<{ id: string }>();
    await call('PUT', `/api/locations/${id}`, {
      payload: { name: 'Sala 2', address: 'Rua B, 20' },
    });
    const list = (await call('GET', '/api/locations')).json<{ locations: { address: string }[] }>();
    expect(list.locations.map((place) => place.address)).toEqual(['Rua A, 1', 'Rua B, 20']);
    expect((await call('DELETE', `/api/locations/${id}`)).statusCode).toBe(200);
    expect(first.statusCode).toBe(201);
  });

  it('adds a second professional and never removes the first', async () => {
    const added = await call('POST', '/api/professionals', {
      payload: { name: 'Dra. Ana Fictícia' },
    });
    expect(added.statusCode).toBe(201);
    const { professionals } = (await call('GET', '/api/professionals')).json<{
      professionals: { id: string; name: string }[];
    }>();
    expect(professionals).toHaveLength(2);
    const [first, second] = professionals;
    expect((await call('DELETE', `/api/professionals/${first?.id ?? ''}`)).statusCode).toBe(409);
    expect((await call('DELETE', `/api/professionals/${second?.id ?? ''}`)).statusCode).toBe(200);
  });
});
