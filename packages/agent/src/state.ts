import type { AgentState } from '@app/ai';

const DATE_TIME: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};
const LOCALE = 'pt-BR';

export interface StateSources {
  now: Date;
  timezone: string;
  contactName: string | undefined;
  firstMessage: boolean;
  summary: string | null;
}

export function buildState({
  now,
  timezone,
  contactName,
  firstMessage,
  summary,
}: StateSources): AgentState {
  return {
    now: now.toLocaleString(LOCALE, { ...DATE_TIME, timeZone: timezone }),
    contactName,
    appointments: [], // ponytail: the model lists them with a tool, so any time it cites comes from a tool output
    done: [],
    firstMessage,
    summary: summary ?? undefined,
  };
}
