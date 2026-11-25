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

export const UsageCopy = {
  title: 'Plano e uso',
  more: 'Mais',
  empty: {
    title: 'Nenhuma conversa neste mês ainda',
    body: 'Quando os pacientes escreverem, o uso aparece aqui, com o quanto falta para a franquia do seu plano.',
  },
  planLine: (plan: string, monthlyCents: number) =>
    `Plano ${plan} · ${formatCents(monthlyCents)} por mês`,
  usedLine: (used: number, franchise: number) =>
    `${used.toLocaleString('pt-BR')} de ${franchise.toLocaleString('pt-BR')} conversas`,
  percentLine: (percent: number) => `${String(percent)}% da franquia`,
  barLabel: 'Conversas usadas na franquia do mês',
  conversationHelp:
    'Uma conversa é uma sequência de mensagens com o mesmo paciente, sem intervalo maior que 24 horas.',
  warning: 'Você já usou 80% das conversas do mês. O atendimento segue normal.',
  full: 'As conversas do plano acabaram. O atendimento continua e o que passar é cobrado como excedente.',
  restricted:
    'O teto de excedente foi atingido. O assistente só avisa o paciente que você responde em breve, e as conversas passam para você.',
  overageHeading: 'Excedente do mês',
  overageLine: (conversations: number, cents: number) =>
    `${String(conversations)} conversas acima da franquia, estimativa de ${formatCents(cents)} na próxima fatura.`,
  overageNone: 'Nenhuma conversa acima da franquia.',
  capHeading: 'Teto de excedente',
  capHint:
    'Valor máximo de excedente que você aceita pagar no mês, em reais. Deixe em branco para não ter teto. Ao atingir, o assistente para de responder e avisa o paciente que você responde em breve.',
  capLabel: 'Teto (R$)',
  capPlaceholder: 'Sem teto',
  capInvalid: 'Digite o valor em reais, por exemplo 100 ou 100,50.',
  capCurrent: (cents: number | null) =>
    cents === null ? 'Hoje: sem teto.' : `Hoje: ${formatCents(cents)} por mês.`,
  capForbidden: 'Só o dono da conta pode mudar o teto.',
  capSaveFailed: 'Não conseguimos salvar o teto. Tente de novo.',
  capSaved: 'Teto salvo.',
  metaHeading: 'Custo na Meta',
  metaNote:
    'A Meta cobra à parte, direto de você, as mensagens enviadas ao paciente fora da janela de 24 horas (lembretes, confirmações e mensagens ativas). Responder a quem escreveu primeiro não tem custo. Isso não entra na sua fatura nem no excedente, e o valor depende da tabela da Meta para o Brasil.',
  loadFailed: 'Não conseguimos carregar o uso. Confira a conexão e tente de novo.',
} as const;
