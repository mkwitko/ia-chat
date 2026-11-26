import { TopicStatus, type TopicSummary } from '../clinic/clinic-model';
import { AssistantCopy } from './assistant-copy';
import { Autonomy, type IdentityMode } from './settings-api';

// The values of the "Assistente" summary, in plain words (owner, 26/11/2026).

export const AssistantSummaryCopy = {
  title: 'Assistente',
  intro: 'Como o assistente conversa com os pacientes e o que ele sabe responder.',
  autonomy: 'Quanto ele faz sozinho',
  identity: 'Como ele se apresenta',
  tone: 'Jeito de escrever',
  knowledge: 'O que ele sabe responder',
  messages: 'Mensagens automáticas',
  test: 'Testar o assistente',
  testHint: 'Converse com ele como se fosse um paciente. Nada é enviado.',
  toneDone: 'Escreve do seu jeito',
  toneDefault: 'Ainda no jeito padrão',
  answers: (count: number) => (count === 1 ? '1 resposta' : `${String(count)} respostas`),
  waiting: (count: number) =>
    count === 1 ? '1 pergunta esperando você' : `${String(count)} perguntas esperando você`,
  followUpOn: 'Lembrar quem parou de responder: ligado',
  reviewOn: 'Pedir avaliação no Google: ligado',
  allOff: 'Nenhuma ligada',
  join: ' · ',
} as const;

const Copy = AssistantSummaryCopy;
const labelOf = <T extends string>(list: readonly { value: T; label: string }[], value: T) =>
  list.find((choice) => choice.value === value)?.label ?? '';

/** "Desligado" asks for attention: patients get only the away message. */
export function autonomySummary(autonomy: Autonomy): TopicSummary {
  return {
    value: labelOf(AssistantCopy.autonomy, autonomy),
    status: autonomy === Autonomy.off ? TopicStatus.todo : TopicStatus.done,
  };
}

export function identitySummary(mode: IdentityMode): TopicSummary {
  return { value: labelOf(AssistantCopy.identity, mode), status: TopicStatus.done };
}

export function toneSummary(set: boolean): TopicSummary {
  return set
    ? { value: Copy.toneDone, status: TopicStatus.done }
    : { value: Copy.toneDefault, status: TopicStatus.optional };
}

/** Questions the assistant could not answer are the owner's to-do. */
export function knowledgeSummary(answers: number, waiting: number): TopicSummary {
  const parts = [Copy.answers(answers), ...(waiting ? [Copy.waiting(waiting)] : [])];
  return {
    value: parts.join(Copy.join),
    status: waiting ? TopicStatus.todo : TopicStatus.done,
  };
}

export function messagesSummary(followUp: boolean, review: boolean): TopicSummary {
  const on = [...(followUp ? [Copy.followUpOn] : []), ...(review ? [Copy.reviewOn] : [])];
  if (on.length === 0) return { value: Copy.allOff, status: TopicStatus.optional };
  return { value: on.join(Copy.join), status: TopicStatus.done };
}
