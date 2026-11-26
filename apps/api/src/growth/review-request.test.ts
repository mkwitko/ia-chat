import { REVIEW_DEFAULT_DELAY_HOURS, REVIEW_MAX_DELAY_HOURS } from '@app/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// M-12: off by default; turns on only with the review link in the profile. Fictitious data.

const PATH = '/api/growth/review-request';
const LINK = 'https://g.page/r/exemplo-ficticio/review';

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
  (await call('GET')).json<{ enabled: boolean; delayHours: number; reviewLink: string | null }>();

describe('review request settings', () => {
  it('starts off with the default delay and no link', async () => {
    expect(await view()).toMatchObject({
      enabled: false,
      delayHours: REVIEW_DEFAULT_DELAY_HOURS,
      reviewLink: null,
    });
  });

  it('refuses to turn on without the review link', async () => {
    const reply = await call('PUT', { enabled: true, delayHours: 3 });
    expect(reply.statusCode).toBe(422);
    expect(reply.json<{ error: string }>().error).toBe('review_link_missing');
  });

  it('turns on with the link, with audit, and refuses a delay out of range', async () => {
    await ctx.db.client.tenant.update({
      where: { id: tenantId },
      data: { businessProfile: { reviewLink: LINK } },
    });
    expect((await call('PUT', { enabled: true, delayHours: 5 })).statusCode).toBe(200);
    expect(await view()).toMatchObject({ enabled: true, delayHours: 5, reviewLink: LINK });
    const audits = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.findMany({ where: { entity: 'review_request' } }),
    );
    expect(audits).toHaveLength(1);
    const tooLong = { enabled: true, delayHours: REVIEW_MAX_DELAY_HOURS + 1 };
    expect((await call('PUT', tooLong)).statusCode).toBe(400);
  });

  it('lets the receptionist read but not change', async () => {
    const receptionist = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.receptionist,
    });
    expect((await call('GET', undefined, receptionist)).statusCode).toBe(200);
    expect((await call('PUT', { enabled: false, delayHours: 3 }, receptionist)).statusCode).toBe(
      403,
    );
  });
});
