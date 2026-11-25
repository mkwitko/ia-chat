import { randomUUID } from 'node:crypto';
import { slugFor } from '@app/core';
import { ActorType, TenantStatus, type Db } from '@app/db';
import { APIError } from 'better-auth/api';
import { Role } from '../auth/access.ts';
import { claimInvite } from './invite-store.ts';

// Owner decision (25/11/2026): a new account needs an onboarding invite (H-37). The invite page
// puts the token in an http-only cookie, so the same gate covers e-mail sign-up and Google.

export const INVITE_COOKIE = 'ca_invite';
export const INVITE_REQUIRED = 'INVITE_REQUIRED';
const REFUSED_STATUS = 'BAD_REQUEST';
const PENDING = 'pending';
const AUDIT_ENTITY = 'onboarding_invite';
const AUDIT_ACTION = 'invite.used';
export const INVITE_REQUIRED_MESSAGE =
  'O cadastro é só por convite. Entre na lista de espera no nosso site e avisamos quando abrir a sua vaga.';

interface HookContext {
  getCookie: (key: string) => string | null | undefined;
}
interface NewUser {
  id: string;
  email: string;
  name: string;
}

/** The invite each sign-up request claimed, so the after-hook opens exactly that one. */
const claimed = new WeakMap<object, string>();

/** Someone invited to join a team (Better Auth invitation) may still create their own login. */
async function teamInvitationPending(db: Db, email: string): Promise<boolean> {
  const found = await db.client.invitation.findFirst({
    where: { email: email.toLowerCase(), status: PENDING, expiresAt: { gt: new Date() } },
    select: { id: true },
  });
  return found !== null;
}

/** Better Auth databaseHooks.user.create: refuse without an invite, then open the consultório. */
export function inviteGate(db: Db) {
  return {
    before: async (user: { email: string }, ctx: HookContext | null) => {
      const token = ctx?.getCookie(INVITE_COOKIE);
      const inviteId = token ? await claimInvite(db, token, new Date()) : null;
      if (ctx && inviteId) {
        claimed.set(ctx, inviteId);
        return;
      }
      if (await teamInvitationPending(db, user.email)) return;
      throw new APIError(REFUSED_STATUS, {
        code: INVITE_REQUIRED,
        message: INVITE_REQUIRED_MESSAGE,
      });
    },
    after: async (user: NewUser, ctx: HookContext | null) => {
      const inviteId = ctx ? claimed.get(ctx) : undefined;
      if (inviteId) await openTenant(db, { inviteId, user });
    },
  };
}

/**
 * The invited consultório, with the practice name from the invite, its owner and first professional.
 * It starts in "setup": the 14-day trial starts when the WhatsApp connects (H-24).
 */
async function openTenant(db: Db, { inviteId, user }: { inviteId: string; user: NewUser }) {
  const invite = await db.client.onboardingInvite.findUniqueOrThrow({ where: { id: inviteId } });
  const tenantId = randomUUID();
  await db.withTenant(tenantId, async (tx) => {
    const name = invite.practiceName;
    await tx.tenant.create({
      data: { id: tenantId, name, slug: slugFor(name), status: TenantStatus.setup, trialEndsAt: null },
    });
    await tx.membership.create({ data: { tenantId, userId: user.id, role: Role.owner } });
    await tx.professional.create({ data: { tenantId, name: user.name } });
    await tx.onboardingInvite.update({
      where: { id: inviteId },
      data: { usedByUserId: user.id, tenantId },
    });
    await tx.auditLog.create({
      data: {
        tenantId,
        actorType: ActorType.user,
        actorId: user.id,
        action: AUDIT_ACTION,
        entity: AUDIT_ENTITY,
        entityId: inviteId,
        after: { inviteId, invitedBy: invite.createdById },
      },
    });
  });
}
