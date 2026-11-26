import { Locale, locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { formatCents } from '@/lib/money';

// Panel copy in pt-BR (spec 05, "Assinatura do SaaS"; spec 10).

export const PLAN_LABEL: Record<string, string> = {
  essencial: 'Essencial',
  agenda: 'Agenda',
  pro: 'Pro',
  clinica: 'Clínica',
};

export const BillingCopy = defineMessages({
  [Locale.ptBR]: {
    title: 'Assinatura',
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
      `${franchise.toLocaleString(locale)} conversas por mês, e ${formatCents(overageCents)} por conversa a mais`,
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
      'Cancelar? Não há novas cobranças. O assistente atende até o fim do período já pago; depois para, e os dados ficam guardados por 30 dias.',
    endsAt: (iso: string) =>
      `Assinatura cancelada. O assistente atende até ${new Date(iso).toLocaleDateString(locale, { timeZone: 'UTC' })}.`,
    cancelYes: 'Sim, cancelar',
    cancelNo: 'Voltar',
    subscribed: 'Assinatura criada. A primeira fatura chega por e-mail.',
    planChanged: 'Plano trocado.',
    cancelled: 'Assinatura cancelada.',
    failed: 'Não conseguimos concluir agora. Tente de novo em instantes.',
    forbidden: 'Só o dono da conta mexe na assinatura.',
  },
  [Locale.enUS]: {},
});
