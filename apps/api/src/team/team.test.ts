import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  authPost,
  createTenant,
  joinAs,
  lastLinkTo,
  signUp,
  signUpVerified,
  startTestApp,
  uniqueEmail,
  verify,
  type TestContext,
} from '../test-support.ts';
import type { PublicTeamInvite } from './team-invite-routes.ts';

// Spec 10, "Mais > Equipe": the owner invites, resends, revokes, changes roles and removes;
// the receptionist can do none of it and never reads billing.

let ctx: TestContext;
let owner: string;
let receptionist: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
  receptionist = await joinAs(ctx, { ownerCookie: owner, tenantId, role: Role.receptionist });
});
afterAll(() => ctx.app.close());

const invite = (email: string, cookie = owner, extra: object = {}) =>
  authPost(ctx, {
    path: '/organization/invite-member',
    body: { email, role: Role.receptionist, organizationId: tenantId, ...extra },
    cookie,
  });
const lookup = (id: string) => ctx.app.inject({ method: 'GET', url: `/api/team-invites/${id}` });
const idOf = (email: string) => lastLinkTo(ctx.outbox, email).split('/').pop() ?? '';
const memberOf = (email: string) =>
  ctx.db.client.membership.findFirstOrThrow({ where: { tenantId, user: { email } } });

describe('team invitations', () => {
  it('invites by e-mail and the link page reads who invited it and for what', async () => {
    const email = uniqueEmail();
    expect((await invite(email)).statusCode).toBe(200);
    const found = await lookup(idOf(email));
    expect(found.json<PublicTeamInvite>()).toMatchObject({
      state: 'pending',
      email,
      role: Role.receptionist,
    });
  });

  it('resends the same invitation instead of creating another', async () => {
    const email = uniqueEmail();
    await invite(email);
    const first = idOf(email);
    const again = await invite(email, owner, { resend: true });
    expect(again.statusCode).toBe(200);
    expect(idOf(email)).toBe(first);
    expect(ctx.outbox.sent.filter((message) => message.to === email)).toHaveLength(2);
  });

  it('revokes: the link page shows it as canceled', async () => {
    const email = uniqueEmail();
    await invite(email);
    const invitationId = idOf(email);
    const revoked = await authPost(ctx, {
      path: '/organization/cancel-invitation',
      body: { invitationId },
      cookie: owner,
    });
    expect(revoked.statusCode).toBe(200);
    expect((await lookup(invitationId)).json<PublicTeamInvite>().state).toBe('canceled');
  });

  it('an unknown or malformed link is a 404', async () => {
    expect((await lookup('00000000-0000-4000-8000-000000000000')).statusCode).toBe(404);
    expect((await lookup('nao-e-um-id')).statusCode).toBe(404);
  });
});

describe('team members', () => {
  it('the owner changes a role and removes a member', async () => {
    const email = uniqueEmail();
    await invite(email);
    const invitationId = idOf(email);
    await signUp(ctx, { email });
    const cookie = await verify(ctx, email);
    await authPost(ctx, {
      path: '/organization/accept-invitation',
      body: { invitationId },
      cookie,
    });
    const member = await memberOf(email);
    const changed = await authPost(ctx, {
      path: '/organization/update-member-role',
      body: { memberId: member.id, role: Role.professional, organizationId: tenantId },
      cookie: owner,
    });
    expect(changed.statusCode).toBe(200);
    expect((await memberOf(email)).role).toBe(Role.professional);
    const removed = await authPost(ctx, {
      path: '/organization/remove-member',
      body: { memberIdOrEmail: member.id, organizationId: tenantId },
      cookie: owner,
    });
    expect(removed.statusCode).toBe(200);
    expect(await ctx.db.client.membership.count({ where: { id: member.id } })).toBe(0);
  });
});

describe('receptionist permissions', () => {
  it('can not invite, revoke, change roles or remove', async () => {
    const email = uniqueEmail();
    await invite(email);
    const target = await memberOf(
      (
        await ctx.db.client.user.findFirstOrThrow({
          where: { memberships: { some: { tenantId, role: Role.owner } } },
        })
      ).email,
    );
    const attempts = [
      invite(uniqueEmail(), receptionist),
      authPost(ctx, {
        path: '/organization/cancel-invitation',
        body: { invitationId: idOf(email) },
        cookie: receptionist,
      }),
      authPost(ctx, {
        path: '/organization/update-member-role',
        body: { memberId: target.id, role: Role.receptionist, organizationId: tenantId },
        cookie: receptionist,
      }),
      authPost(ctx, {
        path: '/organization/remove-member',
        body: { memberIdOrEmail: target.id, organizationId: tenantId },
        cookie: receptionist,
      }),
    ];
    const [inviting, revoking, changing, removing] = await Promise.all(attempts);
    expect([inviting, revoking, changing].map((response) => response?.statusCode)).toEqual([
      403, 403, 403,
    ]);
    // Better Auth checks "last owner" before permission here: refused either way, nothing removed.
    expect(removing?.statusCode).not.toBe(200);
    expect(await ctx.db.client.membership.count({ where: { id: target.id } })).toBe(1);
  });

  it('does not see billing', async () => {
    const response = await ctx.app.inject({
      method: 'GET',
      url: '/api/billing',
      headers: { cookie: receptionist },
    });
    expect(response.statusCode).toBe(403);
  });
});
