import { formatCents } from '@/lib/money';

// Panel copy in pt-BR (spec 05, "Assinatura do SaaS"; spec 10).

export const PLAN_LABEL: Record<string, string> = {
  essencial: 'Essencial',
  agenda: 'Agenda',
  pro: 'Pro',
  clinica: 'Clínica',
};

export const BillingCopy = {
  title: 'Assinatura',
  more: 'Mais',
  off: 'A cobrança ainda não está disponível nesta conta. Fale com o suporte.',
  loadFailed: 'Não conseguimos carregar a assinatura. Confira a conexão e tente de novo.',
  status: {
    trial: 'Você está no teste grátis.',
    active: 'Assinatura ativa.',
    restricted:
      'O assistente está em modo restrito: ele só avisa o paciente que você responde em breve.',
    cancelled: 'Assinatura cancelada. O assistente não atende mais.',
  },
  overdue: 'Há uma fatura vencida. Pague para o assistente voltar ao normal.',
  payInvoice: 'Pagar a fatura',
  choosePlan: 'Escolha o plano',
  planLine: (franchise: number, overageCents: number) =>
    `${franchise.toLocaleString('pt-BR')} conversas por mês, excedente de ${formatCents(overageCents)} por conversa`,
  price: (cents: number) => `${formatCents(cents)} por mês`,
  current: 'Plano atual',
  subscribe: 'Assinar este plano',
  change: 'Trocar para este plano',
  changeNote: 'O novo valor vale a partir da próxima fatura; as conversas do plano mudam já.',
  documentLabel: 'CPF ou CNPJ',
  documentHint: 'Usado só para emitir a cobrança. Só um teste grátis por documento.',
  documentSave: 'Salvar documento',
  documentSaved: 'Documento salvo.',
  documentTaken: 'Esse documento já tem uma conta.',
  documentInvalid: 'Confira o CPF ou CNPJ.',
  cancel: 'Cancelar assinatura',
  cancelConfirm:
    'Cancelar agora? O assistente para de atender e os dados ficam guardados por 30 dias.',
  cancelYes: 'Sim, cancelar',
  cancelNo: 'Voltar',
  subscribed: 'Assinatura criada. A primeira fatura chega por e-mail.',
  planChanged: 'Plano trocado.',
  cancelled: 'Assinatura cancelada.',
  failed: 'Não conseguimos concluir agora. Tente de novo em instantes.',
  forbidden: 'Só o dono da conta mexe na assinatura.',
} as const;
