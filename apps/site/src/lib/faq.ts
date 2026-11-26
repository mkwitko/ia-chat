import { PLANS, PlanId, WARNING_PERCENT } from '@app/core';
import { formatBrl } from './money.ts';

export interface Faq {
  question: string;
  answer: string;
}

const first = PlanId.essencial;
const featured = PlanId.agenda;

/**
 * The remaining objections (founder/landing-brief.md, section 9). Answers match the terms of use;
 * values come from PLANS, never typed here.
 */
export const FAQS: readonly Faq[] = [
  {
    question: 'O paciente fala com um robô ou com gente?',
    answer:
      'Com o assistente do seu consultório, que se apresenta como assistente virtual. Se o paciente perguntar, ele diz a verdade. E você assume a conversa a qualquer momento, com um toque.',
  },
  {
    question: 'Preciso trocar de número?',
    answer:
      'Não. O assistente atende no mesmo número, e você continua usando o WhatsApp Business no celular. Se você responde por lá, o assistente para naquela conversa.',
  },
  {
    question: 'E se eu quiser parar?',
    answer:
      'Você cancela pelo painel, sem multa. O serviço continua até o fim do período já pago, e não há fidelidade.',
  },
  {
    question: 'Funciona com áudio?',
    answer:
      'Sim. O assistente entende os áudios que o paciente manda e responde por escrito, como numa conversa normal.',
  },
  {
    question: 'Quem paga a Meta?',
    answer:
      'Você, direto à Meta, no seu cartão. As respostas que você mesmo envia pelo celular não são cobradas; mensagens que o assistente envia por iniciativa própria, como lembretes, têm custo. A página de preços traz uma estimativa por volume.',
  },
  {
    question: 'O que acontece numa urgência?',
    answer:
      'O assistente não dá orientação de saúde. Se o paciente descreve uma urgência, ele orienta ligar para o SAMU 192 e avisa você na hora, no celular.',
  },
  {
    question: 'Quanto custa, no total?',
    answer: `O plano Essencial sai por ${formatBrl(PLANS[first].monthlyCents)} e o Agenda por ${formatBrl(PLANS[featured].monthlyCents)} por mês, sem taxa de implantação. Com ${String(WARNING_PERCENT)}% da franquia usada, você recebe um aviso; acima dela, cada conversa a mais tem preço fixo e você define um teto.`,
  },
];
