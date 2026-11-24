// Fictitious clinic for the evaluation battery (spec 04, "Avaliação"). No real data.

export const TIME_ZONE = 'America/Sao_Paulo';
/** The battery runs on a fixed clock: Monday, 04/01/2027, 09:00 in São Paulo. */
export const NOW = new Date('2027-01-04T09:00:00-03:00');
export const UTC_OFFSET = '-03:00';
/** Same offset in milliseconds; São Paulo has no daylight saving since 2019. */
export const LOCAL_OFFSET_MS = -10_800_000;

export interface Service {
  id: string;
  name: string;
  minutes: number;
  priceCents: number;
  bookable: boolean;
}

export const SERVICES: readonly Service[] = [
  {
    id: 'avaliacao',
    name: 'Avaliação quiropráxica (primeira consulta)',
    minutes: 60,
    priceCents: 18_000,
    bookable: true,
  },
  {
    id: 'ajuste',
    name: 'Sessão de ajuste quiropráxico',
    minutes: 40,
    priceCents: 15_000,
    bookable: true,
  },
  {
    id: 'miofascial',
    name: 'Liberação miofascial',
    minutes: 50,
    priceCents: 17_000,
    bookable: true,
  },
  {
    id: 'pacote',
    name: 'Pacote de 5 sessões de ajuste (agendadas uma a uma)',
    minutes: 40,
    priceCents: 65_000,
    bookable: false,
  },
];

/** Working windows per weekday (0 = Sunday), in local hours. */
export const HOURS: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  1: [
    [8, 12],
    [14, 18],
  ],
  2: [
    [8, 12],
    [14, 18],
  ],
  3: [
    [8, 12],
    [14, 18],
  ],
  4: [
    [8, 12],
    [14, 18],
  ],
  5: [
    [8, 12],
    [14, 17],
  ],
  6: [[8, 12]],
};

export const MIN_CANCEL_HOURS = 24;

/** Other patients' appointments: they make the agenda busy and create conflicts. */
export const BUSY: readonly { serviceId: string; start: string }[] = [
  { serviceId: 'ajuste', start: '2027-01-04T10:00:00-03:00' },
  { serviceId: 'ajuste', start: '2027-01-04T11:00:00-03:00' },
  { serviceId: 'avaliacao', start: '2027-01-04T14:00:00-03:00' },
  { serviceId: 'avaliacao', start: '2027-01-05T08:00:00-03:00' },
  { serviceId: 'ajuste', start: '2027-01-05T09:00:00-03:00' },
  { serviceId: 'miofascial', start: '2027-01-05T10:00:00-03:00' },
  { serviceId: 'ajuste', start: '2027-01-05T14:00:00-03:00' },
  { serviceId: 'ajuste', start: '2027-01-06T08:00:00-03:00' },
  { serviceId: 'avaliacao', start: '2027-01-06T09:00:00-03:00' },
  { serviceId: 'ajuste', start: '2027-01-09T08:00:00-03:00' },
  { serviceId: 'ajuste', start: '2027-01-09T09:00:00-03:00' },
  { serviceId: 'ajuste', start: '2027-01-09T10:00:00-03:00' },
  { serviceId: 'ajuste', start: '2027-01-09T11:00:00-03:00' },
];

export const CLINIC = {
  assistantName: 'Lia',
  professional: 'Dr. Rafael Exemplo',
  specialty: 'quiropraxia',
  address: 'Rua Exemplo, 123, sala 4, Centro, Curitiba (PR)',
  addressNotes:
    'Estacionamento conveniado na Rua Fictícia, 50 (1 hora grátis). Prédio com elevador.',
  tone: 'Cordial e direto. Trata o paciente por você. Frases curtas. No máximo um emoji por mensagem.',
  examples: [
    'Oi! Aqui é a Lia, do consultório do Dr. Rafael 😊 Como posso te ajudar?',
    'Tenho terça às 15h ou quarta às 10h. Qual fica melhor pra você?',
    'Prontinho, ficou agendado! Qualquer coisa é só me chamar.',
  ],
  knowledge: [
    'Pagamento: Pix, cartão de débito ou crédito (até 3x sem juros no pacote). Não aceita cheque.',
    'Não atende por convênio. Emite recibo para pedir reembolso ao plano.',
    'A primeira consulta é sempre a avaliação; depois dela o profissional indica as sessões.',
    'Vir com roupa confortável. Trazer exames de imagem recentes, se tiver (não é obrigatório).',
    'Atende a partir de 12 anos; menores de 18 com responsável presente.',
    'Cancelamento ou remarcação sem custo até 24 horas antes do horário.',
    'Atrasos acima de 15 minutos podem reduzir o tempo da sessão.',
    'Não atende em domicílio.',
  ],
} as const;
