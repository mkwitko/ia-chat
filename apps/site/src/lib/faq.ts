import { PLANS, PlanId, WARNING_PERCENT } from '@app/core';
import { formatBrl } from './money.ts';

export interface Faq {
  question: string;
  answer: string;
}

const first = PlanId.essencial;
const last = PlanId.clinica;

/** The purchase questions (spec 09). Values come from PLANS, never typed here. */
export const FAQS: readonly Faq[] = [
  {
    question: 'Quanto custa?',
    answer: `A mensalidade vai de ${formatBrl(PLANS[first].monthlyCents)} a ${formatBrl(PLANS[last].monthlyCents)}, conforme o plano. Há ainda uma implantação paga uma vez. A tabela completa está na página de preços.`,
  },
  {
    question: 'O que é uma conversa?',
    answer:
      'É a troca de mensagens com um paciente sem pausa maior que 24 horas. Não importa quantas mensagens ela tenha.',
  },
  {
    question: 'E se eu passar da franquia do mês?',
    answer: `Você recebe um aviso com ${String(WARNING_PERCENT)}% de uso. Passou de 100%, o atendimento continua e cada conversa a mais entra na fatura seguinte. Você define um teto para esse valor; ao atingi-lo, o assistente avisa o paciente que você responde em breve.`,
  },
  {
    question: 'Quem paga a Meta?',
    answer:
      'Nós. O custo da Meta já está na mensalidade e no excedente; você não cadastra cartão na Meta.',
  },
  {
    question: 'O assistente inventa preço ou horário?',
    answer:
      'Não. Preço, endereço e horário vêm do que você cadastrou e da sua agenda, e toda resposta é conferida antes de sair.',
  },
  {
    question: 'Ele dá orientação clínica?',
    answer:
      'Não. Ele pode perguntar o que está incomodando, para você chegar preparado, mas não avalia nem orienta. Em caso de urgência, orienta ligar para o SAMU 192 e avisa você na hora.',
  },
  {
    question: 'Posso assumir uma conversa?',
    answer:
      'A qualquer momento, pelo painel no celular. Se você responde pelo seu WhatsApp, o assistente para.',
  },
  {
    question: 'Preciso aprovar cada resposta?',
    answer:
      'No começo, sim: todo cliente inicia em "aprovar antes de enviar". Quando ganhar confiança, você libera o modo automático.',
  },
  {
    question: 'Os dados dos meus pacientes treinam modelos de IA?',
    answer: 'Não. Os dados são protegidos conforme a LGPD e não são usados para treinar modelos.',
  },
  {
    question: 'Posso testar antes de assinar?',
    answer:
      'O acesso abre em lotes, pela lista de espera. O teste de 14 dias sem cartão está planejado para quando o cadastro sozinho estiver no ar.',
  },
];
