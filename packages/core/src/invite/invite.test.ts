import { describe, expect, it } from 'vitest';
import {
  hashInviteToken,
  INVITE_TTL_DAYS,
  InviteState,
  inviteExpiresAt,
  inviteState,
  newInviteToken,
} from './invite.ts';

const DAY = 86_400_000;
const T0 = new Date('2027-02-01T12:00:00Z');
const TOKEN_BYTES = 32;

describe('invite token', () => {
  it('is 32 random bytes, url-safe, never the same twice', () => {
    const token = newInviteToken();
    expect(Buffer.from(token, 'base64url')).toHaveLength(TOKEN_BYTES);
    expect(token).toMatch(/^[\w-]+$/);
    expect(newInviteToken()).not.toBe(token);
  });

  it('is stored only as a hash that does not reveal it', () => {
    const token = newInviteToken();
    expect(hashInviteToken(token)).toBe(hashInviteToken(token));
    expect(hashInviteToken(token)).not.toContain(token);
  });
});

describe('inviteState', () => {
  const pending = { status: 'pending', expiresAt: inviteExpiresAt(T0) } as const;

  it('expires after 7 days', () => {
    expect(INVITE_TTL_DAYS).toBe(7);
    expect(inviteState(pending, new Date(T0.getTime() + 6 * DAY))).toBe(InviteState.pending);
    expect(inviteState(pending, new Date(T0.getTime() + 7 * DAY))).toBe(InviteState.expired);
  });

  it('a used or cancelled invite keeps its status even after the deadline', () => {
    const late = new Date(T0.getTime() + 30 * DAY);
    expect(inviteState({ ...pending, status: 'used' }, late)).toBe(InviteState.used);
    expect(inviteState({ ...pending, status: 'cancelled' }, late)).toBe(InviteState.cancelled);
  });
});
