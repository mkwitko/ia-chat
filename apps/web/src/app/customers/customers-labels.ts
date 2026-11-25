import {
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  LostReason,
  Origin,
  Stage,
} from './customers-types';

// pt-BR labels for the fixed vocabularies (RN-56: plain words, second person).

export const StageLabel: Record<Stage, string> = {
  [Stage.newContact]: 'Novo contato',
  [Stage.booked]: 'Agendado',
  [Stage.attended]: 'Cliente',
  [Stage.notBooked]: 'Não agendou',
  [Stage.lost]: 'Perdido',
};

export const OriginLabel: Record<Origin, string> = {
  [Origin.whatsappDirect]: 'WhatsApp direto',
  [Origin.referral]: 'Indicação',
  [Origin.site]: 'Site',
  [Origin.adClick]: 'Anúncio',
  [Origin.imported]: 'Importado',
  [Origin.manual]: 'Cadastro manual',
};

export const LostReasonLabel: Record<LostReason, string> = {
  [LostReason.price]: 'Preço',
  [LostReason.distance]: 'Distância',
  [LostReason.chooseOther]: 'Escolheu outro profissional',
  [LostReason.noLongerNeeded]: 'Não precisa mais',
  [LostReason.wrongNumber]: 'Número errado',
  [LostReason.other]: 'Outro',
};

export const ConsentKindLabel: Record<ConsentKind, string> = {
  [ConsentKind.optIn]: 'Aceitou receber',
  [ConsentKind.optOut]: 'Pediu para parar',
};

export const ConsentCategoryLabel: Record<ConsentCategory, string> = {
  [ConsentCategory.service]: 'atendimento',
  [ConsentCategory.marketing]: 'novidades e lembretes de retorno',
  [ConsentCategory.all]: 'todas as mensagens',
};

export const ConsentSourceLabel: Record<ConsentSource, string> = {
  [ConsentSource.patientMessage]: 'Mensagem do paciente',
  [ConsentSource.ownerPanel]: 'Painel',
  [ConsentSource.backfill]: 'Histórico anterior',
};

export const AppointmentStatusLabel: Record<string, string> = {
  scheduled: 'Agendado',
  confirmed: 'Confirmado',
  cancelled: 'Cancelado',
  completed: 'Compareceu',
  no_show: 'Faltou',
};

const OPEN_STATUSES = new Set(['scheduled', 'confirmed']);
const MARKED_STATUSES = new Set(['completed', 'no_show']);

/** Presence can be marked once the start has passed (or corrected after a mark). */
export function canMarkAttendance(
  appointment: { startsAt: string; status: string },
  now = new Date(),
): boolean {
  const started = Date.parse(appointment.startsAt) <= now.getTime();
  const markable = OPEN_STATUSES.has(appointment.status) || MARKED_STATUSES.has(appointment.status);
  return started && markable;
}
