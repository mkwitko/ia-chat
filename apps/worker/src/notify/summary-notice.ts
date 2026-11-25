import type { Notice } from './reasons.ts';

// RF-15, RN-38: the nightly push says how many, never who. The panel shows the list.

export interface AgendaSummary {
  /** Appointments of the next local day (never zero: an empty day sends nothing). */
  count: number;
  /** Local date, `YYYY-MM-DD`; the link opens the agenda on that day. */
  day: string;
}

export type SummaryNotifier = (input: AgendaSummary & { tenantId: string }) => Promise<void>;

const AGENDA_PATH = '/agenda?dia=';
const TAG = 'agenda-summary';

export const SummaryCopy = {
  title: 'Sua agenda de amanhã',
  body: (count: number) =>
    count === 1
      ? 'Você tem 1 atendimento amanhã. Toque para ver.'
      : `Você tem ${String(count)} atendimentos amanhã. Toque para ver.`,
} as const;

export function buildSummaryNotice({ count, day }: AgendaSummary): Notice {
  return {
    title: SummaryCopy.title,
    body: SummaryCopy.body(count),
    url: `${AGENDA_PATH}${day}`,
    tag: TAG,
    urgent: false,
  };
}
