import {
  conversationBlocks,
  factsFromToolOutputs,
  JUDGE_QUESTIONS,
  JUDGE_THRESHOLDS,
  JudgeKind,
  JudgeQuestionId,
  Task,
  timesIn,
  validateReply,
  Violation,
  type AiGateway,
  type GenerateResult,
  type ToolOutput,
} from '@app/ai';
import type { ModelMessage, ToolSet } from 'ai';
import type { AgentInput } from './input.ts';

// Spec 04, "Validação da saída": check, retry once with the correction, then give up
// (the caller hands off). Jev complements the rules and fails safe (null = rules only).

const VIOLATION_TEXT: Readonly<Record<Violation, string>> = {
  [Violation.empty]: 'a resposta veio vazia',
  [Violation.tooLong]: 'a resposta passou de 900 caracteres; seja mais concisa',
  [Violation.systemMarkup]: 'a resposta tinha marcação de sistema',
  [Violation.forbiddenPrice]: 'a especialidade proíbe informar valores',
  [Violation.unknownPrice]: 'citou um valor que não está no perfil nem veio de ferramenta',
  [Violation.unknownTime]: 'citou um horário que não veio de ferramenta',
  [Violation.unconfirmedAction]:
    'afirmou uma ação (agendar, cancelar, remarcar) sem a ferramenta confirmar',
  [Violation.forbiddenTerm]: 'usou um termo proibido pela especialidade',
  [Violation.clinicalConduct]: 'deu orientação clínica',
};
const RETRY_INTRO = 'Sua resposta anterior foi recusada pela verificação porque';
const RETRY_OUTRO = 'Reescreva a resposta ao paciente sem isso.';
const TOOL_ROLE = 'tool';
const TOOL_RESULT = 'tool-result';

export interface CheckedCall {
  gateway: AiGateway;
  turn: { tenantId: string; conversationId?: string; turnId?: string };
  input: AgentInput;
  tools: ToolSet;
}

export type Checked = { ok: true; result: GenerateResult } | { ok: false; violations: Violation[] };

export async function generateChecked(call: CheckedCall): Promise<Checked> {
  const first = await attempt(call, []);
  if (first.violations.length === 0) return { ok: true, result: first.result };
  const second = await attempt(call, first.violations);
  return second.violations.length === 0
    ? { ok: true, result: second.result }
    : { ok: false, violations: second.violations };
}

async function attempt(call: CheckedCall, previous: readonly Violation[]) {
  const { gateway, turn, input, tools } = call;
  const feedback = previous.length
    ? [
        {
          text: `${RETRY_INTRO} ${previous.map((v) => VIOLATION_TEXT[v]).join('; ')}. ${RETRY_OUTRO}`,
          cache: false,
        },
      ]
    : [];
  const result = await gateway.generate({
    task: Task.conversation,
    ...turn,
    system: [...conversationBlocks(input.profile, input.state), ...feedback],
    messages: input.history,
    tools,
    personalNames: input.personalNames,
  });
  return { result, violations: await check(gateway, { turn, input, result }) };
}

async function check(
  gateway: AiGateway,
  { turn, input, result }: { turn: CheckedCall['turn']; input: AgentInput; result: GenerateResult },
): Promise<Violation[]> {
  const violations = validateReply(result.text, {
    catalogCents: input.profile.services.map((service) => service.priceCents),
    pricesForbidden: input.profile.pricesForbidden,
    forbiddenTerms: input.forbiddenTerms,
    // Times the tenant wrote anywhere in its profile are facts too (hours, knowledge, arrival).
    allowedTimes: profileTimes(input),
    facts: factsFromToolOutputs(toolOutputsOf(result.messages)),
  });
  if (violations.length) return violations;
  const { clinical } = await gateway.judge(turn, {
    state: { resposta_da_recepcao: result.text },
    questions: { clinical: JUDGE_QUESTIONS[JudgeQuestionId.clinicalAdvice] },
  });
  const advice =
    clinical?.kind === JudgeKind.noul &&
    clinical.probability >= JUDGE_THRESHOLDS[JudgeQuestionId.clinicalAdvice];
  return advice ? [Violation.clinicalConduct] : [];
}

/** Tool results of this call, as plain outputs for the facts. */
function toolOutputsOf(messages: readonly ModelMessage[]): ToolOutput[] {
  return messages.flatMap((message) => {
    if (message.role !== TOOL_ROLE) return [];
    return message.content.flatMap((part) =>
      part.type === TOOL_RESULT
        ? [{ tool: part.toolName, output: 'value' in part.output ? part.output.value : null }]
        : [],
    );
  });
}

function profileTimes({ profile }: AgentInput): string[] {
  const texts = [
    ...profile.hours,
    ...profile.knowledge.map((item) => `${item.question} ${item.answer}`),
    profile.arrival ?? '',
    profile.cancellationRule ?? '',
  ];
  return texts.flatMap(timesIn);
}
