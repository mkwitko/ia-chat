import { JudgeKind, type JudgeQuestion } from '../judge.ts';

// Spec 04, "Juízos tipados": the questions and the thresholds measured on Portuguese
// labeled cases in the E-07 battery (24/11/2026). Recalibrate with pilot data.

export const JudgeQuestionId = {
  urgent: 'urgente',
  wantsHuman: 'pede_humano',
  optOut: 'opt_out',
  offTopic: 'fora_do_escopo',
  confirmedSlot: 'confirmou_horario',
  clinicalAdvice: 'orientacao_clinica',
  healthInfo: 'informacao_de_saude',
  frustration: 'frustracao',
} as const;
export type JudgeQuestionId = (typeof JudgeQuestionId)[keyof typeof JudgeQuestionId];

const noul = (instructions: string): JudgeQuestion => ({ kind: JudgeKind.noul, instructions });

export const JUDGE_QUESTIONS: Readonly<Record<JudgeQuestionId, JudgeQuestion>> = {
  urgente: noul(
    'A `mensagem` do paciente descreve uma possível emergência de saúde que exige atendimento imediato (SAMU ou pronto-socorro agora)?',
  ),
  pede_humano: noul(
    'Na `mensagem`, o paciente pede para falar com uma pessoa, com o profissional ou com um atendente humano, em vez do assistente?',
  ),
  opt_out: noul(
    'Na `mensagem`, o paciente pede para não receber mais mensagens deste consultório?',
  ),
  fora_do_escopo: noul(
    'A `mensagem` trata de assunto sem relação com o consultório (agenda, serviços, preços, endereço, pagamentos ou atendimento)?',
  ),
  confirmou_horario: noul(
    'A `resposta_do_paciente` confirma exatamente o horário e o serviço da `proposta_da_recepcao`, sem pedir outro horário nem ficar em dúvida?',
  ),
  orientacao_clinica: noul(
    'A `resposta_da_recepcao` dá orientação clínica, diagnóstico, exercício, remédio, conduta ou promessa de resultado de tratamento?',
  ),
  informacao_de_saude: noul(
    'A `mensagem` contém informação sobre a saúde de alguém (sintoma, doença, dor, exame, remédio, tratamento ou condição)?',
  ),
  frustracao: noul(
    'Na `mensagem`, o paciente demonstra frustração, irritação ou insatisfação com o atendimento?',
  ),
};

/** Measured in E-07 (spec 04, "Resultado da avaliação"). */
export const JUDGE_THRESHOLDS: Readonly<Record<JudgeQuestionId, number>> = {
  urgente: 0.5,
  pede_humano: 0.7,
  opt_out: 0.3,
  fora_do_escopo: 0.55,
  confirmou_horario: 0.35,
  orientacao_clinica: 0.85,
  informacao_de_saude: 0.6,
  frustracao: 0.65,
};
