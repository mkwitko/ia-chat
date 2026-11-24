// Typed judgments (spec 04, "Juízos tipados"). Fail-safe: a failure or a slow answer
// yields null per question; callers then fall back to the conservative behavior.

export const JudgeKind = { noul: 'noul', choice: 'choice', score: 'score' } as const;

export type JudgeQuestion =
  | { kind: typeof JudgeKind.noul; instructions: string }
  | {
      kind: typeof JudgeKind.choice;
      instructions: string;
      options: Record<string, string | null>;
    }
  | { kind: typeof JudgeKind.score; instructions: string; levels: readonly string[] };

export type JudgeAnswer<Q extends JudgeQuestion> = Q extends { kind: 'noul' }
  ? { kind: 'noul'; probability: number }
  : Q extends { kind: 'choice'; options: infer O }
    ? { kind: 'choice'; choice: keyof O & string; confidence: number }
    : { kind: 'score'; score: number; confidence: number };

export type JudgeQuestions = Record<string, JudgeQuestion>;
export type JudgeAnswers<Q extends JudgeQuestions> = { [K in keyof Q]: JudgeAnswer<Q[K]> | null };

export interface JudgeUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface JudgeRequest<Q extends JudgeQuestions> {
  state: unknown;
  questions: Q;
  timeoutMs?: number;
}

export interface JudgeProvider {
  ask(
    request: { state: unknown; questions: JudgeQuestions },
    signal: AbortSignal,
  ): Promise<{ answers: Record<string, unknown>; usage: JudgeUsage }>;
}

export interface JudgeResult<Q extends JudgeQuestions> {
  answers: JudgeAnswers<Q>;
  usage: JudgeUsage | null;
}

/** Spec 04: Jev slower than 2 s does not block the turn. */
export const JUDGE_TIMEOUT_MS = 2_000;

export async function judge<Q extends JudgeQuestions>(
  provider: JudgeProvider,
  { state, questions, timeoutMs = JUDGE_TIMEOUT_MS }: JudgeRequest<Q>,
): Promise<JudgeResult<Q>> {
  const signal = AbortSignal.timeout(timeoutMs);
  const aborted = new Promise<null>((resolve) => {
    signal.addEventListener('abort', () => {
      resolve(null);
    });
  });
  const reply = await Promise.race([
    provider.ask({ state, questions }, signal).catch(() => null),
    aborted,
  ]);
  const answers = Object.fromEntries(
    Object.keys(questions).map((id) => [id, reply?.answers[id] ?? null]),
  ) as JudgeAnswers<Q>;
  return { answers, usage: reply?.usage ?? null };
}
