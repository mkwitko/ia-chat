import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  newConversation,
  signUpVerified,
  startTestApp,
  uniqueEmail,
  type TestContext,
} from '../test-support.ts';
import { auditOperator, OperatorAction } from './grants.ts';

// E-27: operator guard, client overview and the RN-35 grant.

const operatorEmail = uniqueEmail();
const HOURS = 2;
const TOO_MANY_HOURS = 25;
const MS_PER_HOUR = 3_600_000;
const REASON = 'Chamado de suporte 123: mensagem não saiu';
const MICRO_USD = 10_000n; // US$ 0,01 -> R$ 0,055 -> 5 cents (truncated)
const COST_CENTS = 5;
const ESSENCIAL_CENTS = 19_700;

interface ClientRow {
  id: string;
  plan: string;
  channelConnected: boolean;
  costCents: number;
  marginCents: number;
  revenueCents: number;
}

let ctx: TestContext;
let owner: string;
let operator: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, { env: { OPERATOR_EMAILS: operatorEmail } });
  owner = await signUpVerified(ctx);
  operator = await signUpVerified(ctx, operatorEmail);
  tenantId = await createTenant(ctx, owner);
});
afterAll(() => ctx.app.close());

const get = (url: string, cookie = operator) =>
  ctx.app.inject({ method: 'GET', url, headers: { cookie } });
const requestAccess = (payload: object, cookie = operator) =>
  ctx.app.inject({
    method: 'POST',
    url: `/api/operator/tenants/${tenantId}/access`,
    headers: { cookie },
    payload,
  });
const conversationsUrl = (id = tenantId) => `/api/operator/tenants/${id}/conversations`;

describe('operator guard', () => {
  it('refuses anonymous callers and tenant owners', async () => {
    const anonymous = await ctx.app.inject({ method: 'GET', url: '/api/operator/clients' });
    expect(anonymous.statusCode).toBe(401);
    expect((await get('/api/operator/clients', owner)).statusCode).toBe(403);
    expect((await get('/api/operator/me', owner)).statusCode).toBe(403);
    expect((await requestAccess({ reason: REASON, hours: HOURS }, owner)).statusCode).toBe(403);
    expect((await get(conversationsUrl(), owner)).statusCode).toBe(403);
  });

  it('lets the allowlisted operator in', async () => {
    expect((await get('/api/operator/me')).statusCode).toBe(200);
  });
});

describe('clients overview', () => {
  it('lists the tenant with plan, channel state, cost and margin', async () => {
    const conversationId = await newConversation(ctx, tenantId);
    await ctx.db.withTenant(tenantId, (tx) =>
      tx.aiUsage.create({
        data: {
          tenantId,
          conversationId,
          task: 'reply',
          provider: 'test',
          model: 'test',
          costMicroUsd: MICRO_USD,
        },
      }),
    );
    const rows = (await get(`/api/operator/clients?tenantId=${tenantId}`)).json<ClientRow[]>();
    expect(rows[0]).toMatchObject({
      plan: 'essencial',
      channelConnected: false,
      costCents: COST_CENTS,
      revenueCents: ESSENCIAL_CENTS,
      marginCents: ESSENCIAL_CENTS - COST_CENTS,
    });
  });
});

describe('tenant access grant (RN-35)', () => {
  it('refuses a read without a grant, then allows it with one and audits both', async () => {
    const denied = await get(conversationsUrl());
    expect(denied.statusCode).toBe(403);
    expect(denied.json()).toEqual({ error: 'no_active_grant' });
    expect((await requestAccess({ reason: REASON, hours: HOURS })).statusCode).toBe(200);
    const read = await get(conversationsUrl());
    expect(read.statusCode).toBe(200);
    expect(read.json<{ costs: { costCents: number }[] }>().costs[0]?.costCents).toBe(COST_CENTS);
    const rows = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.findMany({ where: { actorType: 'operator' }, select: { action: true } }),
    );
    expect(rows.map((a) => a.action).sort((a, b) => a.localeCompare(b))).toEqual([
      OperatorAction.accessGranted,
      OperatorAction.tenantRead,
    ]);
  });

  it('shows the grant to the tenant owner, not to a receptionist', async () => {
    const view = await get('/api/operator-access', owner);
    expect(view.json<{ reason: string; operatorEmail: string }[]>()[0]).toMatchObject({
      reason: REASON,
      operatorEmail,
    });
    const reception = await joinAs(ctx, { ownerCookie: owner, tenantId, role: Role.receptionist });
    expect((await get('/api/operator-access', reception)).statusCode).toBe(403);
  });

  it('refuses an expired grant', async () => {
    const fresh = await createTenant(ctx, await signUpVerified(ctx));
    const user = await ctx.db.client.user.findUniqueOrThrow({ where: { email: operatorEmail } });
    const expiresAt = new Date(Date.now() - MS_PER_HOUR).toISOString();
    await ctx.db.withTenant(fresh, (tx) =>
      auditOperator(tx, {
        tenantId: fresh,
        operatorId: user.id,
        action: OperatorAction.accessGranted,
        details: { reason: REASON, expiresAt },
      }),
    );
    expect((await get(conversationsUrl(fresh))).statusCode).toBe(403);
  });

  it('rejects a grant above 24 h, a short reason and an unknown tenant', async () => {
    expect((await requestAccess({ reason: REASON, hours: TOO_MANY_HOURS })).statusCode).toBe(400);
    expect((await requestAccess({ reason: 'curto', hours: 1 })).statusCode).toBe(400);
    const unknown = await ctx.app.inject({
      method: 'POST',
      url: `/api/operator/tenants/${randomUUID()}/access`,
      headers: { cookie: operator },
      payload: { reason: REASON, hours: 1 },
    });
    expect(unknown.statusCode).toBe(404);
  });
});
