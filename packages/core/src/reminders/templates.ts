import { localParts } from '../agenda/zoned.ts';
import { PlannedKind } from './plan.ts';

// RF-46, RF-47 and spec 03 (24 h window): outside the window the official channel only sends
// a template Meta approved. Generic texts, no health wording: they fit any small business.
// Registering them at Meta is an external step (E-00b); the names below are what to register.

export const TEMPLATE_LANGUAGE = 'pt_BR';
const MINUTES_PER_HOUR = 60;
const PAD = 2;
const NO_ADDRESS = 'o endereço combinado';
const PLACEHOLDER = /\{\{(\d)\}\}/g;

export interface MessageTemplate {
  name: string;
  language: string;
  /** Meta body format: {{1}} service, {{2}} date, {{3}} time, {{4}} place. */
  body: string;
}

export const MessageTemplates = {
  confirmation: {
    name: 'agendamento_confirmado',
    language: TEMPLATE_LANGUAGE,
    body: 'Agendamento confirmado: {{1}} em {{2}} às {{3}}. Local: {{4}}. Se precisar remarcar, é só responder aqui.',
  },
  reminder: {
    name: 'lembrete_agendamento',
    language: TEMPLATE_LANGUAGE,
    body: 'Lembrete: {{1}} em {{2}} às {{3}}. Local: {{4}}. Responda CONFIRMAR para confirmar ou REMARCAR para escolher outro horário.',
  },
  reminderNear: {
    name: 'lembrete_agendamento_proximo',
    language: TEMPLATE_LANGUAGE,
    body: 'Seu horário está chegando: {{1}} às {{3}}. Local: {{4}}.',
  },
} as const satisfies Record<string, MessageTemplate>;

export interface TemplateChoice {
  template: MessageTemplate;
  /** The second reminder is not worth a paid template: it goes only inside the window (RF-47). */
  templateAllowed: boolean;
}

export function templateFor(kind: PlannedKind, sequence: number): TemplateChoice {
  if (kind === PlannedKind.confirmation)
    return { template: MessageTemplates.confirmation, templateAllowed: true };
  if (sequence === 0) return { template: MessageTemplates.reminder, templateAllowed: true };
  return { template: MessageTemplates.reminderNear, templateAllowed: false };
}

export interface AppointmentFacts {
  serviceName: string;
  startsAt: Date;
  timezone: string;
  address?: string | null | undefined;
}

const two = (value: number) => String(value).padStart(PAD, '0');

/** The four variables, in the order of the template body. */
export function templateParams(facts: AppointmentFacts): string[] {
  const { day, month, year, minuteOfDay } = localParts(facts.startsAt, facts.timezone);
  return [
    facts.serviceName,
    `${two(day)}/${two(month)}/${String(year)}`,
    `${two(Math.floor(minuteOfDay / MINUTES_PER_HOUR))}:${two(minuteOfDay % MINUTES_PER_HOUR)}`,
    facts.address?.trim().replace(/^$/, NO_ADDRESS) ?? NO_ADDRESS,
  ];
}

/** The text a patient reads (also the free-text version sent inside the 24 h window). */
export function renderTemplate(template: MessageTemplate, params: readonly string[]): string {
  return template.body.replace(PLACEHOLDER, (_, index: string) => params[Number(index) - 1] ?? '');
}
