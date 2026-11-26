export const Route = {
  login: '/entrar',
  signUp: '/criar-conta',
  invite: '/convite/:token',
  forgotPassword: '/esqueci-a-senha',
  resetPassword: '/nova-senha',
  start: '/comecar',
  onboarding: '/configuracao',
  conversations: '/conversas',
  conversation: '/conversas/:id',
  agenda: '/agenda',
  home: '/inicio',
  legacyToday: '/hoje',
  customers: '/clientes',
  customer: '/clientes/:id',
  results: '/resultados',
  more: '/mais',
  assistant: '/mais/assistente',
  assistantAutonomy: '/mais/assistente/autonomia',
  assistantIdentity: '/mais/assistente/apresentacao',
  tone: '/mais/assistente/tom',
  knowledge: '/mais/assistente/base',
  simulator: '/mais/assistente/simulador',
  clinic: '/mais/consultorio',
  clinicBusiness: '/mais/consultorio/negocio',
  clinicServices: '/mais/consultorio/servicos',
  clinicHours: '/mais/consultorio/horarios',
  clinicAddress: '/mais/consultorio/endereco',
  clinicTeam: '/mais/consultorio/quem-atende',
  clinicPayments: '/mais/consultorio/pagamentos',
  clinicCalendar: '/mais/consultorio/google-agenda',
  clinicWhatsapp: '/mais/consultorio/whatsapp',
  importReview: '/mais/consultorio/whatsapp/revisar-importacao',
  account: '/mais/conta',
  accountNotifications: '/mais/conta/avisos-e-aparencia',
  referral: '/mais/conta/indique-e-ganhe',
  usage: '/mais/conta/plano-e-uso',
  billing: '/mais/conta/assinatura',
  team: '/mais/equipe',
  growth: '/mais/assistente/retorno',
  support: '/mais/ajuda',
  teamInvite: '/convite-equipe/:id',
  operator: '/operador',
} as const;

/** Old addresses, kept working after the settings moved under "Meu consultório" (26/11/2026). */
export const LegacyRoute = {
  availability: '/agenda/disponibilidade',
  profile: '/mais/perfil',
  services: '/mais/servicos',
  connections: '/mais/conexoes',
  importReview: '/mais/conexoes/revisar-importacao',
  usage: '/mais/plano-e-uso',
  billing: '/mais/assinatura',
  growth: '/mais/retorno',
  referral: '/mais/indicacao',
} as const;
export type LegacyRoute = (typeof LegacyRoute)[keyof typeof LegacyRoute];

export const invitePath = (token: string) => `/convite/${token}`;
export const teamInvitePath = (id: string) => `/convite-equipe/${id}`;
export const conversationPath = (id: string) => `${Route.conversations}/${id}`;
export const customerPath = (id: string) => `${Route.customers}/${id}`;
