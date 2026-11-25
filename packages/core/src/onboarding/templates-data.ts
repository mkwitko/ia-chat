// FICTITIOUS example values. The professional edits every item before the assistant uses it.

export interface TemplateService {
  name: string;
  durationMinutes: number;
  priceCents: number;
}
export interface TemplateAnswer {
  question: string;
  answer: string;
  /** Dropped when the specialty policy forbids prices. */
  mentionsPrice?: boolean;
}
/** Keys of the built-in templates; the registry is open: any string key may be added as data. */
export const TemplateId = {
  quiropraxia: 'quiropraxia',
  fisioterapia: 'fisioterapia',
  psicologia: 'psicologia',
  nutricao: 'nutricao',
  salaoDeBeleza: 'salao-de-beleza',
} as const;

export interface SpecialtyTemplate {
  label: string;
  services: TemplateService[];
  answers: TemplateAnswer[];
}

const FIRST_VISIT = 'Como funciona a primeira consulta?';
const WHAT_TO_WEAR = 'O que devo vestir?';
const HOW_MUCH = 'Quanto custa?';
const CANCEL = 'Posso remarcar ou cancelar?';

const CANCEL_ANSWER = 'Pode, avisando com 24 horas de antecedência. É só responder aqui.';
const PRICE_ANSWER = 'O valor depende do serviço. Veja a lista de serviços e valores.';

export const SPECIALTY_TEMPLATES: Readonly<Record<string, SpecialtyTemplate>> = {
  [TemplateId.quiropraxia]: {
    label: 'Quiropraxia',
    services: [
      { name: 'Avaliação inicial', durationMinutes: 60, priceCents: 18000 },
      { name: 'Sessão de ajuste', durationMinutes: 30, priceCents: 12000 },
    ],
    answers: [
      {
        question: FIRST_VISIT,
        answer: 'Começa com uma conversa e uma avaliação. Leva cerca de 1 hora.',
      },
      { question: WHAT_TO_WEAR, answer: 'Roupa confortável, que permita se movimentar.' },
      { question: HOW_MUCH, answer: PRICE_ANSWER, mentionsPrice: true },
      { question: CANCEL, answer: CANCEL_ANSWER },
    ],
  },
  [TemplateId.fisioterapia]: {
    label: 'Fisioterapia',
    services: [
      { name: 'Avaliação fisioterapêutica', durationMinutes: 50, priceCents: 15000 },
      { name: 'Sessão de fisioterapia', durationMinutes: 50, priceCents: 10000 },
    ],
    answers: [
      { question: FIRST_VISIT, answer: 'Fazemos uma avaliação e combinamos o plano de sessões.' },
      { question: WHAT_TO_WEAR, answer: 'Roupa leve, como short e camiseta.' },
      { question: HOW_MUCH, answer: PRICE_ANSWER, mentionsPrice: true },
      { question: CANCEL, answer: CANCEL_ANSWER },
    ],
  },
  [TemplateId.psicologia]: {
    label: 'Psicologia',
    services: [
      { name: 'Primeira sessão', durationMinutes: 50, priceCents: 20000 },
      { name: 'Sessão de acompanhamento', durationMinutes: 50, priceCents: 18000 },
    ],
    answers: [
      {
        question: FIRST_VISIT,
        answer: 'É uma conversa para nos conhecermos. Sem preparo especial.',
      },
      { question: 'O atendimento é online?', answer: 'Informe aqui o formato que você oferece.' },
      { question: HOW_MUCH, answer: PRICE_ANSWER, mentionsPrice: true },
      { question: CANCEL, answer: CANCEL_ANSWER },
    ],
  },
  [TemplateId.nutricao]: {
    label: 'Nutrição',
    services: [
      { name: 'Primeira consulta', durationMinutes: 60, priceCents: 22000 },
      { name: 'Retorno', durationMinutes: 40, priceCents: 15000 },
    ],
    answers: [
      { question: FIRST_VISIT, answer: 'Conversamos sobre sua rotina e seus objetivos.' },
      {
        question: 'Preciso levar exames?',
        answer: 'Se tiver exames recentes, traga. Não é obrigatório.',
      },
      { question: HOW_MUCH, answer: PRICE_ANSWER, mentionsPrice: true },
      { question: CANCEL, answer: CANCEL_ANSWER },
    ],
  },
  [TemplateId.salaoDeBeleza]: {
    label: 'Salão de beleza',
    services: [
      { name: 'Corte', durationMinutes: 45, priceCents: 8000 },
      { name: 'Escova', durationMinutes: 40, priceCents: 6000 },
    ],
    answers: [
      {
        question: 'Aceita cartão?',
        answer: 'Informe aqui as formas de pagamento que você aceita.',
      },
      { question: HOW_MUCH, answer: PRICE_ANSWER, mentionsPrice: true },
      { question: CANCEL, answer: CANCEL_ANSWER },
    ],
  },
};
