import { createHash, randomBytes } from 'node:crypto';

// Owner decision (25/11/2026): an account is created only through an onboarding invite (H-37).

const TOKEN_BYTES = 32;
const TOKEN_ENCODING = 'base64url';
const HASH_ALGORITHM = 'sha256';
const HASH_ENCODING = 'hex';
const MS_PER_DAY = 86_400_000;

/** A link is valid this long after it is created or resent. */
export const INVITE_TTL_DAYS = 7;

/** Mirrors the Prisma InviteStatus enum: core does not depend on the database package. */
export const InviteStatusName = {
  pending: 'pending',
  used: 'used',
  cancelled: 'cancelled',
} as const;
export type InviteStatusName = (typeof InviteStatusName)[keyof typeof InviteStatusName];

/** What the operator and the invite page see: the stored status plus "expired", derived. */
export const InviteState = { ...InviteStatusName, expired: 'expired' } as const;
export type InviteState = (typeof InviteState)[keyof typeof InviteState];

export const newInviteToken = (): string => randomBytes(TOKEN_BYTES).toString(TOKEN_ENCODING);

/** Only this goes to the database; the token itself exists only in the link. */
export const hashInviteToken = (token: string): string =>
  createHash(HASH_ALGORITHM).update(token).digest(HASH_ENCODING);

export const inviteExpiresAt = (now: Date): Date =>
  new Date(now.getTime() + INVITE_TTL_DAYS * MS_PER_DAY);

export interface InviteRow {
  status: InviteStatusName;
  expiresAt: Date;
}

export function inviteState({ status, expiresAt }: InviteRow, now: Date): InviteState {
  if (status !== InviteStatusName.pending) return status;
  return expiresAt.getTime() <= now.getTime() ? InviteState.expired : InviteState.pending;
}
