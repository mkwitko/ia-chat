// RF-28: conservative sending on the QR code connection. WAHA's anti-blocking advice: reply only
// to who wrote, space messages, no bulk. Values are ours (hypothesis H-QR-1, spec 03).

export const QrSendLimits = {
  minIntervalMs: 3_000,
  perMinute: 6,
  perDay: 150,
} as const;

export const QrSendKind = { text: 'text', template: 'template' } as const;
export type QrSendKind = (typeof QrSendKind)[keyof typeof QrSendKind];

export const QrSendRefusal = {
  neverWrote: 'qr_never_wrote',
  minuteCap: 'qr_minute_cap',
  dayCap: 'qr_day_cap',
} as const;
export type QrSendRefusal = (typeof QrSendRefusal)[keyof typeof QrSendRefusal];

export interface QrSendFacts {
  /** A confirmation or reminder (template) may go to someone who never wrote; free text may not. */
  kind: QrSendKind;
  contactWrote: boolean;
  lastSentAt: Date | null;
  sentLastMinute: number;
  sentLastDay: number;
  now: Date;
}

export type QrSendDecision = { ok: true; waitMs: number } | { ok: false; refusal: QrSendRefusal };

export function qrSendDecision(facts: QrSendFacts): QrSendDecision {
  if (!facts.contactWrote && facts.kind === QrSendKind.text)
    return { ok: false, refusal: QrSendRefusal.neverWrote };
  if (facts.sentLastDay >= QrSendLimits.perDay) return { ok: false, refusal: QrSendRefusal.dayCap };
  if (facts.sentLastMinute >= QrSendLimits.perMinute)
    return { ok: false, refusal: QrSendRefusal.minuteCap };
  const since = facts.lastSentAt ? facts.now.getTime() - facts.lastSentAt.getTime() : Infinity;
  return { ok: true, waitMs: Math.max(0, QrSendLimits.minIntervalMs - since) };
}

export class QrSendRefused extends Error {
  readonly refusal: QrSendRefusal;
  constructor(refusal: QrSendRefusal) {
    super(refusal);
    this.refusal = refusal;
  }
}
