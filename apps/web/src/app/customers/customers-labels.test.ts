import { describe, expect, it } from 'vitest';
import {
  AppointmentStatusLabel,
  canMarkAttendance,
  LostReasonLabel,
  OriginLabel,
  StageLabel,
} from './customers-labels';
import { LostReason, Origin, Stage } from './customers-types';

describe('labels', () => {
  it('cover every value of the fixed vocabularies', () => {
    expect(new Set(Object.keys(StageLabel))).toEqual(new Set(Object.values(Stage)));
    expect(new Set(Object.keys(OriginLabel))).toEqual(new Set(Object.values(Origin)));
    expect(new Set(Object.keys(LostReasonLabel))).toEqual(new Set(Object.values(LostReason)));
  });

  it('use the words the professional knows', () => {
    expect(StageLabel.attended).toBe('Cliente');
    expect(AppointmentStatusLabel.no_show).toBe('Faltou');
  });
});

describe('canMarkAttendance', () => {
  const now = new Date('2026-11-24T12:00:00Z');
  const past = '2026-11-24T10:00:00Z';
  const future = '2026-11-24T15:00:00Z';

  it('allows past open or already marked appointments', () => {
    expect(canMarkAttendance({ startsAt: past, status: 'scheduled' }, now)).toBe(true);
    expect(canMarkAttendance({ startsAt: past, status: 'confirmed' }, now)).toBe(true);
    expect(canMarkAttendance({ startsAt: past, status: 'no_show' }, now)).toBe(true);
  });

  it('refuses future and cancelled appointments', () => {
    expect(canMarkAttendance({ startsAt: future, status: 'scheduled' }, now)).toBe(false);
    expect(canMarkAttendance({ startsAt: past, status: 'cancelled' }, now)).toBe(false);
  });
});
