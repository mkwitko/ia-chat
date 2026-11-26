import { Locale, locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { formatCents } from '@/lib/money';

// Panel copy in pt-BR (spec 10, "Plano e uso"; spec 01, "Controle de custo imprevisível").

const MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
] as const;

/** "2026-11" as "novembro de 2026". */
export function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${MONTHS[Number(month) - 1] ?? ''} de ${year ?? ''}`;
}

export const UsageCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Plano e uso',
    empty: {
      title: 'Nenhuma conversa neste mês ainda',
      body: 'Quando os pacientes escreverem, o uso aparece aqui, com quanto ainda resta das conversas do seu plano.',
    },
    planLine: (plan: string, monthlyCents: number) =>
      `Plano ${plan} · ${formatCents(monthlyCents)} por mês`,
    usedLine: (used: number, franchise: number) =>
      `${used.toLocaleString(locale)} de ${franchise.toLocaleString(locale)} conversas`,
    percentLine: (percent: number) => `${String(percent)}% das conversas do plano`,
    barLabel: 'Conversas do plano usadas no mês',
    conversationHelp:
      'Uma conversa é uma sequência de mensagens com o mesmo paciente, sem intervalo maior que 24 horas.',
    warning: 'Você já usou 80% das conversas do mês. O atendimento segue normal.',
    full: 'As conversas do plano acabaram. O atendimento continua, e as conversas a mais são cobradas à parte.',
    restricted:
      'Você chegou ao limite de gasto extra que escolheu. O assistente só avisa o paciente que você responde em breve, e as conversas passam para você.',
    overageHeading: 'Conversas a mais neste mês',
    overageLine: (conversations: number, cents: number) =>
      `${String(conversations)} conversas além do plano, cerca de ${formatCents(cents)} na próxima fatura.`,
    overageNone: 'Nenhuma conversa além do plano.',
    capHeading: 'Limite de gasto extra',
    capHint:
      'Quanto, no máximo, você aceita pagar por conversas a mais no mês. Em branco, sem limite. Ao chegar nele, o assistente para de responder e avisa o paciente que você responde em breve.',
    capLabel: 'Limite (R$)',
    capPlaceholder: 'Sem limite',
    capInvalid: 'Digite o valor em reais, por exemplo 100 ou 100,50.',
    capCurrent: (cents: number | null) =>
      cents === null ? 'Hoje: sem limite.' : `Hoje: ${formatCents(cents)} por mês.`,
    capForbidden: 'Só o dono da conta pode mudar o limite.',
    capSaveFailed: 'Não conseguimos salvar o limite. Tente de novo.',
    capSaved: 'Limite salvo.',
    meta: {
      heading: 'WhatsApp (Meta)',
      freeLine: (used: number, free: number) =>
        `Respostas grátis da Meta este mês: ${used.toLocaleString(locale)} de ${free.toLocaleString(locale)}`,
      barLabel: 'Respostas grátis da Meta usadas no mês',
      over: (count: number) =>
        `${count.toLocaleString(locale)} respostas passaram da cota grátis da Meta neste mês.`,
      utility: (count: number) =>
        `Lembretes e confirmações com custo: ${count.toLocaleString(locale)}`,
      marketing: (count: number) =>
        `Mensagens de divulgação com custo: ${count.toLocaleString(locale)}`,
      estimate: (cents: number) => `Estimativa da Meta no seu cartão: ${formatCents(cents)}`,
      note: 'A Meta cobra direto no cartão que você cadastrou nela. Isso não entra na sua fatura daqui, e o valor final é o que a Meta informar.',
      loadFailed: 'Não conseguimos carregar o uso do WhatsApp agora.',
    },
    loadFailed: 'Não conseguimos carregar o uso. Confira a conexão e tente de novo.',
  },
  [Locale.enUS]: {},
});
