import { describe, expect, it } from 'vitest';
import { PipelineStage } from '../../generated/prisma/enums.ts';
import { NOT_BOOKED_AFTER_DAYS, deriveStage, type StageFacts } from './stage.ts';

const DAY = 86_400_000;
const NOW = new Date('2026-11-25T12:00:00Z');
const ago = (days: number) => new Date(NOW.getTime() - days * DAY);

const base: StageFacts = {
  createdAt: ago(0),
  lastMessageAt: ago(0),
  liveAppointments: 0,
  attended: 0,
  appointmentsEver: 0,
  latestFactAt: ago(0),
  override: null,
};
const stage = (facts: Partial<StageFacts>) => deriveStage({ ...base, ...facts }, NOW);

describe('deriveStage', () => {
  it('starts as new contact', () => {
    expect(stage({})).toBe(PipelineStage.new_contact);
  });

  it('is booked with a live appointment, client after one was marked attended', () => {
    expect(stage({ liveAppointments: 1, appointmentsEver: 1 })).toBe(PipelineStage.booked);
    expect(stage({ attended: 1, appointmentsEver: 1 })).toBe(PipelineStage.attended);
    expect(stage({ attended: 2, liveAppointments: 1, appointmentsEver: 3 })).toBe(
      PipelineStage.attended,
    );
  });

  it('did not book when the talk went quiet for N days, with no appointment', () => {
    const idle = ago(NOT_BOOKED_AFTER_DAYS + 1);
    expect(stage({ lastMessageAt: idle })).toBe(PipelineStage.not_booked);
    const fresh = ago(NOT_BOOKED_AFTER_DAYS - 1);
    expect(stage({ lastMessageAt: fresh })).toBe(PipelineStage.new_contact);
  });

  it('counts from creation for a contact without messages', () => {
    expect(stage({ lastMessageAt: null, createdAt: ago(NOT_BOOKED_AFTER_DAYS + 1) })).toBe(
      PipelineStage.not_booked,
    );
  });

  it('did not book after only cancelled or missed appointments', () => {
    expect(stage({ appointmentsEver: 1 })).toBe(PipelineStage.not_booked);
  });

  it('honours the manual stage until a newer fact arrives', () => {
    const override = { stage: PipelineStage.lost, at: ago(1) };
    expect(stage({ override, latestFactAt: ago(2) })).toBe(PipelineStage.lost);
    expect(stage({ override, latestFactAt: null })).toBe(PipelineStage.lost);
    expect(stage({ override, latestFactAt: ago(0) })).toBe(PipelineStage.new_contact);
  });
});
