import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, signUpVerified, startTestApp, type TestContext } from '../test-support.ts';

// S-07: GET /api/support hands the panel the support channels and a patient-free account context.

let ctx: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
});
afterAll(() => ctx.app.close());

describe('support', () => {
  it('returns the short tenant id, plan and status', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/support',
      headers: { cookie: owner },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      context: { tenant: tenantId.slice(0, 8), plan: 'essencial', status: 'setup' },
    });
  });

  it('requires a session', async () => {
    const response = await ctx.app.inject({ method: 'GET', url: '/api/support' });
    expect(response.statusCode).toBeGreaterThanOrEqual(401);
  });
});
