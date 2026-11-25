import { formatCents } from '@/lib/money';
import type { Problem } from './operator-api';

// Panel copy in pt-BR for the platform operator (E-27).

const SHORT_ID = 8;
const REQUEST = 'Pedir acesso';
const STATE_LABELS: Record<string, string> = { failed: 'falhou', discarded: 'descartado' };
const EVENT_LABELS: Record<string, string> = {
  dead_letter: 'Tarefa esgotou as tentativas',
  delivery_failure: 'Falha na entrega de mensagem',
  webhook_error: 'Erro no webhook do WhatsApp',
  turn_aborted: 'Resposta demorou mais de 45 s',
  queue_error: 'Erro na fila',
  job_failed: 'Rotina falhou',
};
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
  problems: {
    heading: 'Erros recentes',
    hint: 'Só códigos e identificadores, nunca o conteúdo das conversas.',
    none: 'Nenhum problema registrado.',
    event: (event: string) => EVENT_LABELS[event] ?? event,
    details: (p: Problem) =>
      [
        new Date(p.createdAt).toLocaleString('pt-BR'),
        p.code && `código ${p.code}`,
        p.queue,
        p.tenantId && `cliente ${shortId(p.tenantId)}`,
        p.conversationId && `conversa ${shortId(p.conversationId)}`,
      ]
        .filter(Boolean)
        .join(' · '),
  },
  meta: {
    heading: 'Gasto dos clientes na Meta no mês',
    hint: 'Gasto dos clientes na Meta, somado, para apoio. Cada cliente paga a Meta no próprio cartão; o valor é estimativa. Só contagens, nunca o conteúdo das conversas.',
    service: (used: number, over: number) =>
      `Respostas de atendimento: ${String(used)} (${String(over)} acima da cota grátis)`,
    templates: (utility: number, marketing: number) =>
      `Com custo: ${String(utility)} lembretes e confirmações, ${String(marketing)} de divulgação`,
    total: (cents: number) => `Gasto estimado dos clientes: ${formatCents(cents)}`,
    topHeading: 'Clientes com maior custo',
    none: 'Nenhum custo neste mês.',
    topLine: (name: string, cents: number, used: number) =>
      `${name}: ${formatCents(cents)} (${String(used)} respostas)`,
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
