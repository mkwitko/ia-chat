import {
  TypeSafeClient,
  choice,
  noul,
  score,
  type ChoiceResponse,
  type NoulResponse,
  type Question,
  type ScoreResponse,
} from '@typesafe-ai/sdk';
import { JudgeKind, type JudgeProvider, type JudgeQuestion } from './judge.ts';

export const JEV_MODEL = 'jev-latest';

type SdkAnswer = NoulResponse | ChoiceResponse | ScoreResponse;

/** Jev (TypeSafe) as the judge provider. No retries: the judge is fail-safe and time-boxed. */
export function typeSafeJudge(apiKey: string): JudgeProvider {
  const client = new TypeSafeClient({ apiKey, retry: { maxRetries: 0 } });
  return {
    async ask({ state, questions }, signal) {
      const sdkQuestions = Object.fromEntries(
        Object.entries(questions).map(([id, question]) => [id, toSdk(question)]),
      );
      const result = await client.systemOne(
        { model: JEV_MODEL, state: state as never, questions: sdkQuestions },
        { signal },
      );
      const answers = Object.fromEntries(
        Object.entries(result.answers).map(([id, answer]) => [id, fromSdk(answer as SdkAnswer)]),
      );
      return {
        answers,
        usage: {
          inputTokens: result.usage.input_tokens ?? 0,
          outputTokens: result.usage.output_tokens ?? 0,
        },
      };
    },
  };
}

function toSdk(question: JudgeQuestion): Question {
  switch (question.kind) {
    case JudgeKind.noul:
      return noul(question.instructions);
    case JudgeKind.choice:
      return choice(question.instructions, question.options);
    case JudgeKind.score:
      return score(question.instructions, [...question.levels]);
  }
}

function fromSdk(answer: SdkAnswer): unknown {
  switch (answer.type) {
    case JudgeKind.noul:
      return { kind: JudgeKind.noul, probability: answer.noul };
    case JudgeKind.choice:
      return { kind: JudgeKind.choice, choice: answer.choice, confidence: answer.confidence };
    case JudgeKind.score:
      return { kind: JudgeKind.score, score: answer.score, confidence: answer.confidence };
  }
}
