// Business outcomes of the agenda (spec 05). The codes are what the assistant tools return.

export const AgendaError = {
  slotTaken: 'slot_taken',
  slotUnavailable: 'horario_indisponivel',
  serviceNotFound: 'servico_nao_encontrado',
  appointmentNotFound: 'agendamento_nao_encontrado',
  tooLateToCancel: 'cancelamento_fora_do_prazo',
  limitReached: 'limite_de_agendamentos',
  noProfessional: 'sem_profissional',
} as const;
export type AgendaError = (typeof AgendaError)[keyof typeof AgendaError];

export type AgendaResult<T> = { ok: true; value: T } | { ok: false; error: AgendaError };

/** Thrown inside a transaction to roll it back with a business reason. */
export class AgendaFailure extends Error {
  readonly code: AgendaError;
  constructor(code: AgendaError) {
    super(code);
    this.code = code;
  }
}

export interface AppointmentView {
  id: string;
  startsAt: Date;
  endsAt: Date;
  serviceName: string;
  status: string;
}

/** RF-45: future appointments one patient may hold (hypothesis: 2; configurable later). */
export const MAX_FUTURE_APPOINTMENTS = 2;

/** Postgres SQLSTATE of an exclusion_violation. */
const EXCLUSION_VIOLATION = '23P01';

export function isExclusionViolation(error: unknown): boolean {
  if (!(error instanceof Object)) return false;
  const text = JSON.stringify(error, Object.getOwnPropertyNames(error));
  return text.includes(EXCLUSION_VIOLATION) || text.includes('appointments_no_overlap');
}
