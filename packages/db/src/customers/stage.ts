import { MS_PER_DAY } from '@app/core';
import { PipelineStage } from '../../generated/prisma/enums.ts';

// Spec 10, "Clientes": the stage is derived from facts (messages, appointments, attendance).
// Recurrence is a count (`attended`), not a stage. The owner's manual stage wins only until something newer happens.

/** Days without any message and without an appointment before a contact counts as "não agendou". */
export const NOT_BOOKED_AFTER_DAYS = 3;

export interface StageFacts {
  createdAt: Date;
  /** Last message of any author; null when the contact never talked (typed in by the owner). */
  lastMessageAt: Date | null;
  /** Scheduled or confirmed appointments. */
  liveAppointments: number;
  /** Appointments the owner marked as attended. */
  attended: number;
  /** Appointments of any status. */
  appointmentsEver: number;
  /** Newest inbound message or appointment change: what can outdate a manual stage. */
  latestFactAt: Date | null;
  override: { stage: PipelineStage; at: Date } | null;
}

export function deriveStage(facts: StageFacts, now: Date): PipelineStage {
  const { override, latestFactAt } = facts;
  if (override && !(latestFactAt && latestFactAt > override.at)) return override.stage;
  if (facts.attended >= 1) return PipelineStage.attended;
  if (facts.liveAppointments >= 1) return PipelineStage.booked;
  if (facts.appointmentsEver >= 1 || isIdle(facts, now)) return PipelineStage.not_booked;
  return PipelineStage.new_contact;
}

function isIdle(facts: StageFacts, now: Date): boolean {
  const last = facts.lastMessageAt ?? facts.createdAt;
  return now.getTime() - last.getTime() > NOT_BOOKED_AFTER_DAYS * MS_PER_DAY;
}
