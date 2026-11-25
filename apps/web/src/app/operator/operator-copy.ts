import { formatCents } from '@/lib/money';

// Panel copy in pt-BR for the platform operator (E-27).

const SHORT_ID = 8;
const REQUEST = 'Pedir acesso';
const STATE_LABELS: Record<string, string> = { failed: 'falhou', discarded: 'descartado' };
const shortId = (id: string) => id.slice(0, SHORT_ID);

export const OperatorCopy = {
  title: 'Operador',
  more: 'Mais',
  empty: 'Nenhum cliente ainda.',
  columns: [
    'Cliente',
    'Plano',
    'WhatsApp',
    'Conversas',
    'Receita',
    'Custo de IA',
    'Margem',
    'Problemas',
    'Acesso',
  ],
  connected: 'Conectado',
  notConnected: 'Sem conexão',
  request: REQUEST,
  usageLine: (used: number, franchise: number) => `${String(used)} de ${String(franchise)}`,
  problemsLine: (failed: number, discarded: number, handoffs: number) =>
    `${String(failed)} falhas, ${String(discarded)} descartes, ${String(handoffs)} transferências`,
  money: formatCents,
  access: {
    heading: (name: string) => `Acesso a ${name}`,
    reason: 'Motivo',
    reasonHint: 'Fica no histórico do cliente, que vê quem entrou e por quê (mínimo de 10 letras).',
    hours: 'Prazo em horas (no máximo 24)',
    submit: REQUEST,
    granted: 'Acesso liberado até o fim do prazo.',
    failed: 'Não foi possível liberar o acesso. Confira o motivo e o prazo.',
  },
  detail: {
    costs: 'Custo por conversa neste mês',
    issues: 'Conversas com falha ou descarte',
    handoffs: 'Transferidas pelo assistente',
    none: 'Nada neste mês.',
    expired: 'Sem acesso ativo. Peça de novo.',
    costLine: (id: string, cents: number) => `${shortId(id)}: ${formatCents(cents)}`,
    issueLine: (id: string, state: string, turns: number) =>
      `${shortId(id)}: ${STATE_LABELS[state] ?? state} (${String(turns)})`,
    handoffLine: (id: string, reason: string | null) => `${shortId(id)}: ${reason ?? '-'}`,
  },
  funnel: {
    heading: 'Funil do cadastro',
    signups: (total: number) => `${String(total)} cadastros`,
    line: (count: number, total: number) => `${String(count)} de ${String(total)}`,
    goal: 'Meta inicial: metade de quem chega ao simulador ativa o assistente.',
  },
  ownerNotice: {
    heading: 'Acessos da equipe da plataforma',
    line: (email: string | null, reason: string, until: string) =>
      `${email ?? 'Operador'} pediu acesso (${reason}) até ${until}.`,
  },
} as const;
