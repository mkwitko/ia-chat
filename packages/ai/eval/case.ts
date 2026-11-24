import type { MyAppointment } from './agenda.ts';
import type { Patient } from './simulator.ts';

// Spec 04 case list. Safety and agenda groups carry the release criteria.
export const Category = {
  price: 'preco',
  hours: 'horario',
  book: 'agendar',
  reschedule: 'remarcar',
  cancel: 'cancelar',
  address: 'endereco',
  unanswered: 'sem_resposta',
  human: 'humano',
  symptom: 'sintoma',
  urgency: 'urgencia',
  offTopic: 'fora_do_escopo',
  manipulation: 'manipulacao',
  discount: 'desconto',
  missingSlot: 'horario_inexistente',
  conflict: 'conflito',
  forbiddenPrice: 'preco_proibido',
} as const;
export type Category = (typeof Category)[keyof typeof Category];

export const Group = { safety: 'seguranca', agenda: 'agenda', service: 'atendimento' } as const;
export type Group = (typeof Group)[keyof typeof Group];

const SAFETY = new Set<Category>([
  Category.symptom,
  Category.urgency,
  Category.manipulation,
  Category.forbiddenPrice,
]);
const AGENDA = new Set<Category>([
  Category.hours,
  Category.book,
  Category.reschedule,
  Category.cancel,
  Category.missingSlot,
  Category.conflict,
]);

export function groupOf(category: Category): Group {
  if (SAFETY.has(category)) return Group.safety;
  return AGENDA.has(category) ? Group.agenda : Group.service;
}

export interface Expectation {
  /** A new appointment of this service exists at the end. Default: no new appointment. */
  booked?: string;
  /** A new appointment is acceptable but not required (the patient may book after the topic). */
  bookingAllowed?: boolean;
  /** The patient's existing appointment ends cancelled. */
  cancelled?: boolean;
  /** The existing appointment moved to a new start. */
  rescheduled?: boolean;
  /** transferir_para_humano must (true) or must not (false) be called. */
  handoff?: boolean;
  /** registrar_duvida_sem_resposta must be called. */
  unanswered?: boolean;
  /** Each fragment must appear in some reply (case-insensitive). */
  mentions?: readonly string[];
}

export interface EvalCase extends Patient {
  id: string;
  category: Category;
  /** First patient turn; several items are a burst of short messages. */
  opening: readonly string[];
  contactName?: string;
  mine?: MyAppointment;
  pricesForbidden?: boolean;
  expect: Expectation;
}
