import { MINUTES_PER_DAY, type LocalDate } from '@app/core';
import * as z from 'zod';

// Shared request shapes of the agenda routes (spec 05, spec 10 "Agenda").

const MINUTES_PER_HOUR = 60;
const PAD = 2;
const TIME_FORMAT = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** `YYYY-MM-DD`, a local calendar day of the tenant. */
export const daySchema = z.iso.date();

/** `HH:MM` on the tenant's wall clock. */
export const timeSchema = z.string().regex(TIME_FORMAT);

export const idParams = z.object({ id: z.uuid() });

export function toLocalDate(day: string): LocalDate {
  const [year = 0, month = 0, date = 0] = day.split('-').map(Number);
  return { year, month, day: date };
}

export function minutesOf(time: string): number {
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  return hour * MINUTES_PER_HOUR + minute;
}

export function timeOf(minuteOfDay: number): string {
  const pad = (value: number) => String(value).padStart(PAD, '0');
  return `${pad(Math.floor(minuteOfDay / MINUTES_PER_HOUR))}:${pad(minuteOfDay % MINUTES_PER_HOUR)}`;
}

/** Postgres `time` column as minutes after midnight; a closing `00:00` means the end of the day. */
export function minuteOfColumn(time: Date): number {
  return time.getUTCHours() * MINUTES_PER_HOUR + time.getUTCMinutes();
}

export function endMinuteOfColumn(time: Date): number {
  return minuteOfColumn(time) || MINUTES_PER_DAY;
}
