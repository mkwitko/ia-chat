import { AppointmentStatus, ConsentCategory, ConsentKind } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';

// M-01 and A-15: the one gate every proactive message to a patient passes (reminders today;
// follow-ups and recovery later). It reads the consent history and the appointment, so a
// stale queue row can never reach a contact who opted out or an appointment that no longer exists.

export const GateRefusal = {
  optOut: 'opt_out',
  appointmentNotLive: 'appointment_not_live',
  contactMissing: 'contact_missing',
  noMarketingConsent: 'no_marketing_consent',
} as const;
export type GateRefusal = (typeof GateRefusal)[keyof typeof GateRefusal];

/** Reminders of a booked appointment are transactional; follow-ups and recovery are marketing. */
export const MessageCategory = { transactional: 'transactional', marketing: 'marketing' } as const;
export type MessageCategory = (typeof MessageCategory)[keyof typeof MessageCategory];

export type GateResult = { ok: true } | { ok: false; reason: GateRefusal };

export interface GateInput {
  contactId: string;
  /** Messages about an appointment also need it live and still in the future. */
  appointmentId?: string | undefined;
  /** Default transactional. Marketing also needs a recorded marketing opt-in. */
  category?: MessageCategory | undefined;
  now: Date;
}

const LIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.scheduled,
  AppointmentStatus.confirmed,
];

const refuse = (reason: GateRefusal): GateResult => ({ ok: false, reason });

export async function proactiveGate(tx: Tx, input: GateInput): Promise<GateResult> {
  const contact = await tx.contact.findFirst({
    where: { id: input.contactId },
    select: { optOutAt: true },
  });
  if (!contact) return refuse(GateRefusal.contactMissing);
  if (contact.optOutAt || (await lastOptOutIsActive(tx, input.contactId)))
    return refuse(GateRefusal.optOut);
  if (
    input.appointmentId &&
    !(await appointmentIsLive(tx, { appointmentId: input.appointmentId, now: input.now }))
  )
    return refuse(GateRefusal.appointmentNotLive);
  if (
    input.category === MessageCategory.marketing &&
    !(await hasMarketingOptIn(tx, input.contactId))
  )
    return refuse(GateRefusal.noMarketingConsent);
  return { ok: true };
}

/** The latest event for "everything" decides; `opt_out_at` is only the fast copy of it. */
async function lastKind(tx: Tx, contactId: string, category: ConsentCategory) {
  const latest = await tx.consentEvent.findFirst({
    where: { contactId, category },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { kind: true },
  });
  return latest?.kind;
}

async function lastOptOutIsActive(tx: Tx, contactId: string): Promise<boolean> {
  return (await lastKind(tx, contactId, ConsentCategory.all)) === ConsentKind.opt_out;
}

async function hasMarketingOptIn(tx: Tx, contactId: string): Promise<boolean> {
  return (await lastKind(tx, contactId, ConsentCategory.marketing)) === ConsentKind.opt_in;
}

async function appointmentIsLive(
  tx: Tx,
  { appointmentId, now }: { appointmentId: string; now: Date },
): Promise<boolean> {
  const count = await tx.appointment.count({
    where: { id: appointmentId, status: { in: LIVE_STATUSES }, startsAt: { gt: now } },
  });
  return count > 0;
}
