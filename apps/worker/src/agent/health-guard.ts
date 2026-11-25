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
const QUESTION = 'health';

interface GuardDeps {
  gateway: AiGateway;
  log: EventLog;
  scope: { tenantId: string; conversationId: string };
}

export function healthGuard({ gateway, log, scope }: GuardDeps): HealthGuard {
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
      log({ ...scope, target, judged: answer != null }, HEALTH_BLOCKED);
    }
    return !safe;
  };
}
