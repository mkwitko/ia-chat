import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  authPost,
  cookieOf,
  createTenant,
  lastLinkTo,
  signIn,
  signUpVerified,
  startTestApp,
  uniqueEmail,
  type TestContext,
} from '../test-support.ts';
import { Permission, Role } from './access.ts';
import { requireTenant } from './tenant-guard.ts';

// E-04 "pronto quando": login, tenant creation and invitation through the API.
// RN-34: receptionist cannot see billing nor change integrations; no access across tenants.

const BILLING = '/test/billing';
const INTEGRATIONS = '/test/integrations';
const CURRENT_TENANT = '/test/current-tenant';

let ctx: TestContext;

// Probe routes guarded exactly like real ones.
function registerProbes(app: FastifyInstance): void {
  app.get(BILLING, { preHandler: requireTenant(Permission.billingRead) }, () => ({ ok: true }));
  app.get(INTEGRATIONS, { preHandler: requireTenant(Permission.integrationsRead) }, () => ({
    ok: true,
  }));
  app.put(INTEGRATIONS, { preHandler: requireTenant(Permission.integrationsManage) }, () => ({
    ok: true,
  }));
  app.get(CURRENT_TENANT, { preHandler: requireTenant() }, async (request) => {
    const tenant = request.tenant;
    if (!tenant) throw new Error('guard did not set the tenant');
    const rows = await tenant.withTenant(
      (tx) => tx.$queryRaw<{ id: string }[]>`select app_current_tenant()::text as id`,
    );
    return { id: rows[0]?.id, role: tenant.role };
  });
}

beforeAll(async () => {
  ctx = await startTestApp(registerProbes);
});

afterAll(async () => {
  await ctx.app.close();
  await ctx.db.client.$disconnect();
});

const get = (url: string, cookie: string) =>
  ctx.app.inject({ method: 'GET', url, headers: { cookie } });
const put = (url: string, cookie: string) =>
  ctx.app.inject({ method: 'PUT', url, headers: { cookie } });

describe('sign-up and login', () => {
  it('refuses login before the email is verified', async () => {
    const email = uniqueEmail();
    await authPost(ctx, {
      path: '/sign-up/email',
      body: { email, password: 'senha-de-teste-123', name: 'X' },
    });
    expect((await signIn(ctx, email)).statusCode).toBe(403);
  });

  it('logs in after verification', async () => {
    const email = uniqueEmail();
    await signUpVerified(ctx, email);
    const response = await signIn(ctx, email);
    expect(response.statusCode).toBe(200);
    expect(cookieOf(response)).toContain('session_token');
  });

  it('emails a password reset link', async () => {
    const email = uniqueEmail();
    await signUpVerified(ctx, email);
    const response = await authPost(ctx, {
      path: '/request-password-reset',
      body: {
        email,
        redirectTo: '/nova-senha',
      },
    });
    expect(response.statusCode).toBe(200);
    expect(lastLinkTo(ctx.outbox, email)).toContain('reset-password');
  });
});

describe('tenant, roles and invitation', () => {
  let ownerCookie = '';
  let receptionistCookie = '';
  let tenantId = '';
  const ownerEmail = uniqueEmail();

  beforeAll(async () => {
    ownerCookie = await signUpVerified(ctx, ownerEmail);
    tenantId = await createTenant(ctx, ownerCookie);

    const receptionistEmail = uniqueEmail();
    receptionistCookie = await signUpVerified(ctx, receptionistEmail);
    const invite = await authPost(ctx, {
      path: '/organization/invite-member',
      body: { email: receptionistEmail, role: Role.receptionist, organizationId: tenantId },
      cookie: ownerCookie,
    });
    expect(invite.statusCode).toBe(200);
    const invitationId = lastLinkTo(ctx.outbox, receptionistEmail).split('/').pop();
    const accepted = await authPost(ctx, {
      path: '/organization/accept-invitation',
      body: { invitationId },
      cookie: receptionistCookie,
    });
    expect(accepted.statusCode).toBe(200);
  });

  it('creating a tenant makes the creator its owner, inside withTenant', async () => {
    const response = await get(CURRENT_TENANT, ownerCookie);
    expect(response.json()).toEqual({ id: tenantId, role: Role.owner });
  });

  it('creating a tenant also creates its professional, named after the owner', async () => {
    const professionals = await ctx.db.withTenant(tenantId, (tx) => tx.professional.findMany());
    expect(professionals.map((professional) => professional.name)).toEqual(['Pessoa Teste']);
  });

  it('a new sign-in comes back with the consultório already active', async () => {
    const fresh = cookieOf(await signIn(ctx, ownerEmail));
    expect((await get(CURRENT_TENANT, fresh)).json()).toEqual({ id: tenantId, role: Role.owner });
  });

  it('owner sees billing and manages integrations', async () => {
    expect((await get(BILLING, ownerCookie)).statusCode).toBe(200);
    expect((await put(INTEGRATIONS, ownerCookie)).statusCode).toBe(200);
  });

  it('receptionist joins by invitation and cannot see billing nor change integrations', async () => {
    expect((await get(CURRENT_TENANT, receptionistCookie)).json()).toEqual({
      id: tenantId,
      role: Role.receptionist,
    });
    expect((await get(BILLING, receptionistCookie)).statusCode).toBe(403);
    expect((await get(INTEGRATIONS, receptionistCookie)).statusCode).toBe(200);
    expect((await put(INTEGRATIONS, receptionistCookie)).statusCode).toBe(403);
  });

  it('a user of another tenant cannot switch into this one', async () => {
    const outsider = await signUpVerified(ctx);
    await createTenant(ctx, outsider);
    const response = await authPost(ctx, {
      path: '/organization/set-active',
      body: { organizationId: tenantId },
      cookie: outsider,
    });
    expect(response.statusCode).toBe(403);
  });

  it('a session pointing at a tenant without membership is refused by the guard', async () => {
    const email = uniqueEmail();
    const outsider = await signUpVerified(ctx, email);
    await ctx.db.client.session.updateMany({
      where: { user: { email } },
      data: { activeTenantId: tenantId },
    });
    expect((await get(CURRENT_TENANT, outsider)).statusCode).toBe(403);
  });

  it('requests without a session are refused', async () => {
    expect((await get(CURRENT_TENANT, '')).statusCode).toBe(401);
  });
});
