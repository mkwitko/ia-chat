import {
  hashInviteToken,
  inviteExpiresAt,
  inviteState,
  InviteState,
  newInviteToken,
} from '@app/core';
import { InviteStatus, type Db } from '@app/db';

// Owner decision (25/11/2026): the operator's onboarding invites (H-37). Platform table, no RLS.

const RECENT_INVITES = 100;

interface InviteRow {
  id: string;
  practiceName: string;
  email: string | null;
  status: InviteStatus;
  expiresAt: Date;
  createdAt: Date;
  usedAt: Date | null;
  tenantId: string | null;
}

/** What the operator sees: never the token nor its hash. */
export const inviteView = (row: InviteRow, now: Date) => ({
  id: row.id,
  practiceName: row.practiceName,
  email: row.email,
  state: inviteState(row, now),
  expiresAt: row.expiresAt,
  createdAt: row.createdAt,
  usedAt: row.usedAt,
  tenantId: row.tenantId,
});
export type InviteView = ReturnType<typeof inviteView>;

export interface NewInvite {
  practiceName: string;
  email: string | null;
  operatorId: string;
  now: Date;
}

/** Creates a pending invite; the token is returned once, for the link, and never stored. */
export async function createInvite(db: Db, input: NewInvite) {
  const token = newInviteToken();
  const row = await db.client.onboardingInvite.create({
    data: {
      tokenHash: hashInviteToken(token),
      practiceName: input.practiceName,
      email: input.email,
      expiresAt: inviteExpiresAt(input.now),
      createdById: input.operatorId,
    },
  });
  return { token, invite: inviteView(row, input.now) };
}

export const listInvites = async (db: Db, now: Date) =>
  (
    await db.client.onboardingInvite.findMany({
      orderBy: { createdAt: 'desc' },
      take: RECENT_INVITES,
    })
  ).map((row) => inviteView(row, now));

export interface InviteChange {
  id: string;
  operatorId: string;
  now: Date;
}

/** New token and deadline on a pending (even expired) invite; the old link stops working. */
export async function resendInvite(db: Db, { id, operatorId, now }: InviteChange) {
  const token = newInviteToken();
  const { count } = await db.client.onboardingInvite.updateMany({
    where: { id, status: InviteStatus.pending },
    data: {
      tokenHash: hashInviteToken(token),
      expiresAt: inviteExpiresAt(now),
      updatedById: operatorId,
    },
  });
  if (count === 0) return null;
  const row = await db.client.onboardingInvite.findUniqueOrThrow({ where: { id } });
  return { token, invite: inviteView(row, now) };
}

export async function cancelInvite(db: Db, { id, operatorId, now }: InviteChange) {
  const { count } = await db.client.onboardingInvite.updateMany({
    where: { id, status: InviteStatus.pending },
    data: { status: InviteStatus.cancelled, updatedById: operatorId },
  });
  if (count === 0) return null;
  return inviteView(await db.client.onboardingInvite.findUniqueOrThrow({ where: { id } }), now);
}

/** What the public invite page may know: the state and the practice name, nothing else. */
export async function publicInvite(db: Db, token: string, now: Date) {
  const row = await db.client.onboardingInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
  });
  if (!row) return null;
  const state = inviteState(row, now);
  const open = state === InviteState.pending;
  return {
    state,
    practiceName: open ? row.practiceName : null,
    email: open ? row.email : null,
    expiresAt: row.expiresAt,
  };
}

/**
 * Atomic single use: one conditional UPDATE, so of two sign-ups racing on the same link only one
 * gets the row back. Returns the invite id, or null when the link is unknown, used, cancelled or expired.
 */
export async function claimInvite(db: Db, token: string, now: Date): Promise<string | null> {
  const tokenHash = hashInviteToken(token);
  const { count } = await db.client.onboardingInvite.updateMany({
    where: { tokenHash, status: InviteStatus.pending, expiresAt: { gt: now } },
    data: { status: InviteStatus.used, usedAt: now },
  });
  if (count === 0) return null;
  // Ours now: a used invite is never resent, so the hash still points at the same row.
  const row = await db.client.onboardingInvite.findUniqueOrThrow({ where: { tokenHash } });
  return row.id;
}
