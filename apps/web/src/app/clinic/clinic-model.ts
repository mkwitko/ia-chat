import type { RuleWindow } from '../agenda/agenda-api';
import { timeToMinute } from '../agenda/agenda-dates';
import { WEEK_ORDER } from '../agenda/rules-model';
import { CalendarState, type CalendarStatus } from '../calendar/calendar-api';
import type { PaymentMethod } from '../profile/profile-api';
import { PAYMENT_LABEL } from '../profile/profile-copy';
import type { WhatsappChannel } from '../whatsapp/whatsapp-api';
import { ClinicCopy as Copy, WEEKDAY_SHORT } from './clinic-copy';

export const TopicStatus = { done: 'done', todo: 'todo', optional: 'optional' } as const;
export type TopicStatus = (typeof TopicStatus)[keyof typeof TopicStatus];

/** One row of a settings summary: the current value in plain words and whether it is set. */
export interface TopicSummary {
  value: string;
  /** Absent on rows that only lead somewhere (Conta › Plano e uso). */
  status?: TopicStatus;
}

const MINUTES_PER_HOUR = 60;
const RANGE_FROM = 3;
const PAD = 2;
const doneIf = (ok: boolean) => (ok ? TopicStatus.done : TopicStatus.todo);

export function businessSummary(name: string, description: string | undefined): TopicSummary {
  const named = name.trim().length > 0;
  const described = (description ?? '').trim().length > 0;
  if (!named) return { value: Copy.missing, status: TopicStatus.todo };
  if (!described) return { value: Copy.noDescription, status: TopicStatus.todo };
  return { value: name, status: TopicStatus.done };
}

export function servicesSummary(services: number, packages: number): TopicSummary {
  if (services === 0) return { value: Copy.noServices, status: TopicStatus.todo };
  const parts = [Copy.serviceCount(services), ...(packages ? [Copy.packageCount(packages)] : [])];
  return { value: parts.join(Copy.listJoin), status: TopicStatus.done };
}

/** "Ter a Qui", "Seg, Qua e Sex": three or more days in a row read as a range. */
export function daysLabel(weekdays: readonly number[]): string {
  const days = WEEK_ORDER.filter((day) => weekdays.includes(day));
  const positions = days.map((day) => WEEK_ORDER.indexOf(day));
  // Sorted and unique: in a row when the span is exactly the count.
  const inRow = (positions.at(-1) ?? 0) - (positions.at(0) ?? 0) === positions.length - 1;
  const names = days.map((day) => WEEKDAY_SHORT.at(day) ?? '');
  const [first = '', ...rest] = names;
  const last = rest.at(-1);
  if (inRow && names.length >= RANGE_FROM && last) return Copy.daysRange(first, last);
  if (!last) return first;
  return `${names.slice(0, -1).join(Copy.listJoin)}${Copy.daysJoin}${last}`;
}

/** "07:00" → "7h", "07:30" → "7h30". */
export function hourLabel(time: string): string {
  const minute = timeToMinute(time);
  const hours = Math.floor(minute / MINUTES_PER_HOUR);
  const rest = minute % MINUTES_PER_HOUR;
  return rest ? `${String(hours)}h${String(rest).padStart(PAD, '0')}` : `${String(hours)}h`;
}

/** "Ter a Qui, 7h–20h": the days with a window, from the earliest start to the latest end. */
export function hoursSummary(rules: readonly RuleWindow[]): TopicSummary {
  if (rules.length === 0) return { value: Copy.noHours, status: TopicStatus.todo };
  const byStart = rules.toSorted((a, b) => timeToMinute(a.start) - timeToMinute(b.start));
  const byEnd = rules.toSorted((a, b) => timeToMinute(b.end) - timeToMinute(a.end));
  const span = Copy.hoursRange(hourLabel(byStart[0]?.start ?? ''), hourLabel(byEnd[0]?.end ?? ''));
  const days = daysLabel([...new Set(rules.map((rule) => rule.weekday))]);
  return { value: `${days}${Copy.listJoin}${span}`, status: TopicStatus.done };
}

export function addressSummary(addresses: readonly string[]): TopicSummary {
  const [main] = addresses;
  if (!main) return { value: Copy.noAddress, status: TopicStatus.todo };
  const extra = addresses.length - 1;
  return { value: extra ? `${main}${Copy.moreAddresses(extra)}` : main, status: TopicStatus.done };
}

export function teamSummary(names: readonly string[]): TopicSummary {
  const value = names.length > 1 ? Copy.professionalCount(names.length) : (names[0] ?? '');
  return { value: value || Copy.missing, status: doneIf(names.length > 0) };
}

function noticeLabel(minutes: number): string {
  if (minutes === 0) return Copy.noticeAnytime;
  const amount =
    minutes % MINUTES_PER_HOUR === 0
      ? Copy.hoursAmount(minutes / MINUTES_PER_HOUR)
      : Copy.minutesAmount(minutes);
  return Copy.notice(amount);
}

export function paymentsSummary(
  methods: readonly PaymentMethod[],
  noticeMinutes: number,
): TopicSummary {
  if (methods.length === 0) return { value: Copy.noPayments, status: TopicStatus.todo };
  const names = methods.map((method) => PAYMENT_LABEL[method]).join(Copy.listJoin);
  return { value: `${names} · ${noticeLabel(noticeMinutes)}`, status: TopicStatus.done };
}

/** Null when the Google Agenda is not offered on this account: the row does not show. */
export function calendarSummary(status: CalendarStatus): TopicSummary | null {
  switch (status.state) {
    case CalendarState.off:
      return null;
    case CalendarState.notConnected:
      return { value: Copy.notConnected, status: TopicStatus.optional };
    case CalendarState.chooseCalendar:
      return { value: Copy.chooseCalendar, status: TopicStatus.todo };
    case CalendarState.needsReconnect:
      return { value: Copy.reconnect, status: TopicStatus.todo };
    case CalendarState.connected:
      return { value: Copy.connectedTo(status.calendarName ?? ''), status: TopicStatus.done };
    default: {
      const never: never = status.state;
      return never;
    }
  }
}

export function whatsappSummary(channel: WhatsappChannel | null): TopicSummary {
  if (!channel) return { value: Copy.notConnected, status: TopicStatus.todo };
  if (!channel.ready) return { value: Copy.whatsappPending, status: TopicStatus.todo };
  const value = channel.displayPhone ? Copy.connectedTo(channel.displayPhone) : Copy.connected;
  return { value, status: TopicStatus.done };
}
