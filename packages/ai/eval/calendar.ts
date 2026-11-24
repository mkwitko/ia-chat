import { LOCAL_OFFSET_MS } from './data/clinic.ts';

/** Local (São Paulo) calendar fields of an instant. */
export function local(date: Date) {
  const shifted = new Date(date.getTime() + LOCAL_OFFSET_MS);
  return {
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    dayStart: new Date(
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
        LOCAL_OFFSET_MS,
    ),
  };
}
