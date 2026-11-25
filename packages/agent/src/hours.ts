// The opening hours and cancellation rule the assistant may state (spec 04, profile block),
// written from the availability rules so the model never guesses them.

export interface HoursRule {
  weekday: number; // 0 = Sunday, as in @app/core availableSlots
  startTime: Date; // time of day, stored as 1970-01-01 UTC
  endTime: Date;
}

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
// Monday first: how people in Brazil read a week of business hours.
const SUNDAY = 0;
const WEEK_ORDER = [...WEEKDAYS.keys()].filter((day) => day !== SUNDAY).concat(SUNDAY);
const CLOSED_OTHERWISE = 'Nos outros dias não há atendimento.';
const RANGE_JOIN = ' e ';
const TIME_LENGTH = 5; // "HH:MM" from an ISO time
const TIME_START = 11; // index of HH in "1970-01-01THH:MM:SS.sssZ"
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;

const timeOf = (date: Date) => date.toISOString().slice(TIME_START, TIME_START + TIME_LENGTH);

export function hoursLines(rules: readonly HoursRule[]): string[] {
  if (rules.length === 0) return [];
  const days = WEEK_ORDER.flatMap((weekday) => {
    const windows = rules
      .filter((rule) => rule.weekday === weekday)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
      .map((rule) => `${timeOf(rule.startTime)} às ${timeOf(rule.endTime)}`);
    return windows.length ? [`${WEEKDAYS[weekday] ?? ''}: ${windows.join(RANGE_JOIN)}`] : [];
  });
  return [...days, CLOSED_OTHERWISE];
}

export function cancellationText(noticeMinutes: number): string | undefined {
  if (noticeMinutes <= 0) return undefined;
  const hours = Math.round(noticeMinutes / MINUTES_PER_HOUR);
  const span =
    hours % HOURS_PER_DAY === 0 && hours > HOURS_PER_DAY
      ? `${String(hours / HOURS_PER_DAY)} dias`
      : `${String(hours)} horas`;
  return `Cancelamento ou remarcação com pelo menos ${span} de antecedência.`;
}
