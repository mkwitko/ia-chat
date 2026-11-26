import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import {
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  LostReason,
  Origin,
  Stage,
} from './customers-types';

// pt-BR labels for the fixed vocabularies (RN-56: plain words, second person).

export const StageLabel: Record<Stage, string> = defineMessages({
  [Locale.ptBR]: {
    [Stage.newContact]: 'Novo contato',
    [Stage.booked]: 'Agendado',
    [Stage.attended]: 'Cliente',
    [Stage.notBooked]: 'Não agendou',
    [Stage.lost]: 'Perdido',
  },
  [Locale.enUS]: {},
});

export const OriginLabel: Record<Origin, string> = defineMessages({
  [Locale.ptBR]: {
    [Origin.whatsappDirect]: 'WhatsApp direto',
    [Origin.referral]: 'Indicação',
    [Origin.site]: 'Site',
    [Origin.adClick]: 'Anúncio',
    [Origin.imported]: 'Importado',
    [Origin.manual]: 'Cadastro manual',
  },
  [Locale.enUS]: {},
});

export const LostReasonLabel: Record<LostReason, string> = defineMessages({
  [Locale.ptBR]: {
    [LostReason.price]: 'Preço',
    [LostReason.distance]: 'Distância',
    [LostReason.chooseOther]: 'Escolheu outro profissional',
    [LostReason.noLongerNeeded]: 'Não precisa mais',
    [LostReason.wrongNumber]: 'Número errado',
    [LostReason.other]: 'Outro',
  },
  [Locale.enUS]: {},
});

export const ConsentKindLabel: Record<ConsentKind, string> = defineMessages({
  [Locale.ptBR]: {
    [ConsentKind.optIn]: 'Aceitou receber',
    [ConsentKind.optOut]: 'Pediu para parar',
  },
  [Locale.enUS]: {},
});

export const ConsentCategoryLabel: Record<ConsentCategory, string> = defineMessages({
  [Locale.ptBR]: {
    [ConsentCategory.service]: 'atendimento',
    [ConsentCategory.marketing]: 'novidades e lembretes de retorno',
    [ConsentCategory.all]: 'todas as mensagens',
  },
  [Locale.enUS]: {},
});

export const ConsentSourceLabel: Record<ConsentSource, string> = defineMessages({
  [Locale.ptBR]: {
    [ConsentSource.patientMessage]: 'Mensagem do paciente',
    [ConsentSource.ownerPanel]: 'Painel',
    [ConsentSource.backfill]: 'Histórico anterior',
    [ConsentSource.form]: 'Formulário',
    [ConsentSource.ownerImport]: 'Importação do profissional',
  },
  [Locale.enUS]: {},
});

export const AppointmentStatusLabel: Record<string, string> = defineMessages({
  [Locale.ptBR]: {
    scheduled: 'Agendado',
    confirmed: 'Confirmado',
    cancelled: 'Cancelado',
    completed: 'Compareceu',
    no_show: 'Faltou',
  },
  [Locale.enUS]: {},
});

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
