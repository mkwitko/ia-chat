import { LEAD_FOLLOW_UP_DEFAULT_DAYS, LEAD_FOLLOW_UP_MAX_DAYS } from '@app/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// M-10: the follow-up is off, has no approved text and waits the default days until the owner
// saves it. Fictitious data only.

const PATH = '/api/growth/lead-follow-up';
const APPROVED = 'Oi! Quer marcar um horário? (texto fictício)';

let ctx: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
});
afterAll(() => ctx.app.close());

const call = (method: 'GET' | 'PUT', payload?: object, cookie = owner) =>
  ctx.app.inject({ method, url: PATH, headers: { cookie }, ...(payload ? { payload } : {}) });
const view = async () =>
  (await call('GET')).json<{ enabled: boolean; days: number; text: string | null }>();

describe('lead follow-up settings', () => {
  it('starts off, without approved text, with the default wait', async () => {
    expect(await view()).toMatchObject({
      enabled: false,
      days: LEAD_FOLLOW_UP_DEFAULT_DAYS,
      text: null,
    });
  });

  it('saving approves the text; audit keeps before and after', async () => {
    const payload = { enabled: true, days: 3, text: APPROVED };
    expect((await call('PUT', payload)).statusCode).toBe(200);
    expect(await view()).toMatchObject({ enabled: true, days: 3, text: APPROVED });
    const audits = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.findMany({ where: { entity: 'lead_follow_up' } }),
    );
    expect(audits).toHaveLength(1);
  });

  it('refuses an empty text and a wait out of range', async () => {
    const base = { enabled: true, days: 2, text: APPROVED };
    expect((await call('PUT', { ...base, text: '  ' })).statusCode).toBe(400);
    expect((await call('PUT', { ...base, days: 0 })).statusCode).toBe(400);
    expect((await call('PUT', { ...base, days: LEAD_FOLLOW_UP_MAX_DAYS + 1 })).statusCode).toBe(
      400,
    );
  });

  it('lets the receptionist read but not change', async () => {
    const receptionist = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.receptionist,
    });
    expect((await call('GET', undefined, receptionist)).statusCode).toBe(200);
    const payload = { enabled: false, days: 2, text: APPROVED };
    expect((await call('PUT', payload, receptionist)).statusCode).toBe(403);
  });
});
