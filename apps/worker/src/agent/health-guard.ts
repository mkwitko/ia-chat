import {
  JUDGE_QUESTIONS,
  JUDGE_THRESHOLDS,
  JudgeKind,
  JudgeQuestionId,
  type AiGateway,
} from '@app/ai';

// M-03: model-written free text is stored only when the health-information judgment says no.
// Fail-safe: a flag, a slow judge or a judge failure all mean "store nothing".

export type EventLog = (fields: object, message: string) => void;
/** Resolves true when the text must NOT be stored. `target` names where it would have gone. */
export type HealthGuard = (text: string, target: string) => Promise<boolean>;

const HEALTH_BLOCKED = 'health_guard.blocked';
/** The judge did not answer (down, slow or no key): the wiring turns this into an alert. */
export const HEALTH_JUDGE_DOWN = 'health_guard.judge_down';
const QUESTION = 'health';

interface GuardDeps {
  gateway: AiGateway;
  log: EventLog;
  scope: { tenantId: string; conversationId: string };
}

export function healthGuard({ gateway, log, scope: source }: GuardDeps): HealthGuard {
  // Only the ids: callers may pass the whole turn, whose messages must not reach usage or logs.
  const scope = { tenantId: source.tenantId, conversationId: source.conversationId };
  return async (text, target) => {
    const answers = await gateway.judge(scope, {
      state: { mensagem: text },
      questions: { [QUESTION]: JUDGE_QUESTIONS[JudgeQuestionId.healthInfo] },
    });
    const answer = answers[QUESTION];
    const safe =
      answer?.kind === JudgeKind.noul &&
      answer.probability < JUDGE_THRESHOLDS[JudgeQuestionId.healthInfo];
    // Never log the text: only where it would have gone and whether the judge answered.
    if (!safe) {
      log(
        { ...scope, target, judged: answer != null },
        answer ? HEALTH_BLOCKED : HEALTH_JUDGE_DOWN,
      );
    }
    return !safe;
  };
}
