// Fictitious fixture data. No real patient; phone numbers in the 0000 range.

export const SEED_TENANT_NAME = 'Clínica Exemplo';

export const FIXTURE = {
  professional: {
    name: 'Dra. Ana Exemplo',
    toneOfVoice: 'Cordial e direto',
    messageExamples: ['Oi! Tudo bem? Posso te ajudar a marcar um horário.'],
  },
  channel: { displayPhone: '+55 11 90000-0000' },
  service: { name: 'Sessão de avaliação', durationMinutes: 50, priceCents: 18_000 },
  location: { name: 'Consultório', address: 'Rua Exemplo, 100 - São Paulo, SP' },
  availability: {
    weekday: 1,
    startTime: new Date('1970-01-01T09:00:00Z'),
    endTime: new Date('1970-01-01T18:00:00Z'),
  },
  timeOff: {
    startsAt: new Date('2027-01-01T00:00:00Z'),
    endsAt: new Date('2027-01-02T00:00:00Z'),
    reason: 'Feriado',
  },
  knowledge: { question: 'Tem estacionamento?', answer: 'Sim, conveniado na rua.' },
  contact: { phoneE164: '+5511900000001', phoneKey: '+551100000001', name: 'Paciente Fictício' },
  message: { text: 'Oi, quanto custa a sessão?' },
  appointment: { startsAt: '2027-01-04 12:00Z', endsAt: '2027-01-04 12:50Z' },
  reminder: { sendAt: new Date('2027-01-03T12:00:00Z') },
  waitlist: {
    windowStart: new Date('2027-01-03T03:00:00Z'),
    windowEnd: new Date('2027-01-10T03:00:00Z'),
  },
  slotOffer: {
    startsAt: new Date('2027-01-05T12:00:00Z'),
    expiresAt: new Date('2027-01-05T12:30:00Z'),
  },
  payment: { amountCents: 5_000, provider: 'pix_manual' },
  aiUsage: {
    task: 'conversation',
    provider: 'fake',
    model: 'fake-model',
    inputTokens: 100,
    outputTokens: 20,
    costMicroUsd: 15n,
  },
  usage: { month: new Date('2027-01-01'), conversations: 1 },
  metaUsage: {
    month: new Date('2027-01-01'),
    category: 'service',
    billable: false,
    pricingType: 'free_customer_service',
  },
  audit: { actorType: 'system', action: 'seed', entity: 'tenant' },
  inboundProvider: 'cloud_api',
  userName: 'Pessoa Fictícia',
  // Ciphertext placeholder: never a real token.
  calendarIntegration: {
    refreshTokenEnc: 'v1.fixture.fixture.fixture',
    calendarName: 'Atendimentos',
  },
  pushSubscription: {
    endpoint: 'https://push.example.test/',
    p256dh: 'p256dh-fake',
    auth: 'auth-fake',
  },
} as const;
