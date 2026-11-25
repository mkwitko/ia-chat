import { describe, expect, it } from 'vitest';
import { DEFAULT_REMINDER_OFFSETS_MINUTES, planMessages, PlannedKind } from './plan.ts';

const NOW = new Date('2027-01-01T12:00:00Z');
const plan = (startsAt: string) =>
  planMessages({
    startsAt: new Date(startsAt),
    now: NOW,
    offsetsMinutes: DEFAULT_REMINDER_OFFSETS_MINUTES,
  });

describe('planMessages', () => {
  it('schedules the confirmation now and the reminders 24 h and 2 h before', () => {
    expect(plan('2027-01-04T12:00:00Z')).toEqual([
      { kind: PlannedKind.confirmation, sequence: 0, sendAt: NOW },
      { kind: PlannedKind.reminder, sequence: 0, sendAt: new Date('2027-01-03T12:00:00Z') },
      { kind: PlannedKind.reminder, sequence: 1, sendAt: new Date('2027-01-04T10:00:00Z') },
    ]);
  });

  it('drops a reminder whose time already passed; the next one becomes the first', () => {
    const planned = plan('2027-01-01T20:00:00Z');
    expect(planned.map(({ kind, sequence }) => [kind, sequence])).toEqual([
      [PlannedKind.confirmation, 0],
      [PlannedKind.reminder, 0],
    ]);
    expect(planned[1]?.sendAt).toEqual(new Date('2027-01-01T18:00:00Z'));
  });

  it('sorts the offsets and honours a custom list', () => {
    const planned = planMessages({
      startsAt: new Date('2027-01-04T12:00:00Z'),
      now: NOW,
      offsetsMinutes: [60, 2_880],
    });
    expect(planned.map(({ sendAt }) => sendAt.toISOString())).toEqual([
      NOW.toISOString(),
      '2027-01-02T12:00:00.000Z',
      '2027-01-04T11:00:00.000Z',
    ]);
  });
});
