import { describe, expect, it } from 'vitest';
import { QrSendKind, QrSendLimits, QrSendRefusal, qrSendDecision } from './limits.ts';

const NOW = new Date('2026-12-01T13:00:00Z');
const quiet = {
  kind: QrSendKind.text,
  contactWrote: true,
  lastSentAt: null,
  sentLastMinute: 0,
  sentLastDay: 0,
  now: NOW,
};
const secondsAgo = (seconds: number) => new Date(NOW.getTime() - seconds * 1000);

describe('QR code send limits (RF-28)', () => {
  it('lets a reply go when nothing was sent recently', () => {
    expect(qrSendDecision(quiet)).toEqual({ ok: true, waitMs: 0 });
  });

  it('never writes first to someone who never wrote, except a confirmation or reminder', () => {
    expect(qrSendDecision({ ...quiet, contactWrote: false })).toEqual({
      ok: false,
      refusal: QrSendRefusal.neverWrote,
    });
    expect(qrSendDecision({ ...quiet, contactWrote: false, kind: QrSendKind.template })).toEqual({
      ok: true,
      waitMs: 0,
    });
  });

  it('spaces messages by the minimum interval instead of refusing', () => {
    expect(qrSendDecision({ ...quiet, lastSentAt: secondsAgo(1) })).toEqual({
      ok: true,
      waitMs: QrSendLimits.minIntervalMs - 1000,
    });
    expect(qrSendDecision({ ...quiet, lastSentAt: secondsAgo(60) })).toEqual({
      ok: true,
      waitMs: 0,
    });
  });

  it('refuses above the per-minute and per-day caps', () => {
    expect(qrSendDecision({ ...quiet, sentLastMinute: QrSendLimits.perMinute })).toEqual({
      ok: false,
      refusal: QrSendRefusal.minuteCap,
    });
    expect(qrSendDecision({ ...quiet, sentLastDay: QrSendLimits.perDay })).toEqual({
      ok: false,
      refusal: QrSendRefusal.dayCap,
    });
    expect(qrSendDecision({ ...quiet, sentLastMinute: QrSendLimits.perMinute - 1 }).ok).toBe(true);
  });
});
