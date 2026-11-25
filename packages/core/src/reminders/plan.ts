import { MS_PER_MINUTE } from '../agenda/zoned.ts';

// RF-46 and RF-47: what to schedule when an appointment is booked.

/** RF-47: first reminder 24 h before, second 2 h before; the tenant may change both. */
const MINUTES_PER_DAY = 1_440;
const TWO_HOURS = 120;
export const DEFAULT_REMINDER_OFFSETS_MINUTES: readonly number[] = [MINUTES_PER_DAY, TWO_HOURS];

export const PlannedKind = { confirmation: 'confirmation', reminder: 'reminder' } as const;
export type PlannedKind = (typeof PlannedKind)[keyof typeof PlannedKind];

export interface PlannedMessage {
  kind: PlannedKind;
  /** 0 for the confirmation and for the first reminder that will go out; 1 for the next. */
  sequence: number;
  sendAt: Date;
}

export interface PlanInput {
  startsAt: Date;
  now: Date;
  offsetsMinutes: readonly number[];
}

/** The confirmation goes now; each reminder whose time has not passed yet, earliest first. */
export function planMessages({ startsAt, now, offsetsMinutes }: PlanInput): PlannedMessage[] {
  const reminders = [...offsetsMinutes]
    .sort((a, b) => b - a)
    .map((offset) => new Date(startsAt.getTime() - offset * MS_PER_MINUTE))
    .filter((sendAt) => sendAt.getTime() > now.getTime());
  return [
    { kind: PlannedKind.confirmation, sequence: 0, sendAt: now },
    ...reminders.map((sendAt, sequence) => ({ kind: PlannedKind.reminder, sequence, sendAt })),
  ];
}
