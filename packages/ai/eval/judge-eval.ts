import { judge, JudgeKind, type JudgeProvider } from '../src/judge.ts';
import { JUDGE_CASES } from './data/judge-cases.ts';
import { JUDGE_QUESTIONS, JudgeQuestionId, type LabeledJudgeCase } from './judge-questions.ts';
import { mapPool } from './pool.ts';

// Measures each judgment on its labeled cases: accuracy, calibration (Brier) and the
// threshold that maximizes accuracy. Urgency must not miss any positive (recall 100%).

/** Longer than production (2 s) so latency is measured instead of cut. */
const EVAL_TIMEOUT_MS = 10_000;
const DEFAULT_THRESHOLD = 0.5;
const THRESHOLD_STEPS = 19; // 0.05 … 0.95
const THRESHOLD_STEP = 0.05;
export const PASS_ACCURACY = 0.9;
const CONCURRENCY = 8;
const HALVES = 2;
const PROBABILITY_DIGITS = 2;
export const P50 = 0.5;
export const P95 = 0.95;
const FULL_RECALL_QUESTIONS = new Set<JudgeQuestionId>([JudgeQuestionId.urgent]);

interface Scored {
  item: LabeledJudgeCase;
  probability: number | null;
  latencyMs: number;
}

export interface QuestionReport {
  question: JudgeQuestionId;
  cases: number;
  unanswered: number;
  accuracyAtDefault: number;
  threshold: number;
  accuracy: number;
  recall: number;
  brier: number;
  passed: boolean;
  misses: string[];
}

export interface JudgeReport {
  questions: QuestionReport[];
  latencyMs: { p50: number; p95: number };
  passed: boolean;
}

export async function evaluateJudge(provider: JudgeProvider): Promise<JudgeReport> {
  const scored = await mapPool(JUDGE_CASES, CONCURRENCY, (item) => score(provider, item));
  const questions = Object.values(JudgeQuestionId).map((question) =>
    report(
      question,
      scored.filter((entry) => entry.item.question === question),
    ),
  );
  const latencies = scored.map((entry) => entry.latencyMs).sort((a, b) => a - b);
  return {
    questions,
    latencyMs: { p50: percentile(latencies, P50), p95: percentile(latencies, P95) },
    passed: questions.every((entry) => entry.passed),
  };
}

async function score(provider: JudgeProvider, item: LabeledJudgeCase): Promise<Scored> {
  const started = performance.now();
  const { answers } = await judge(provider, {
    state: item.state,
    questions: { answer: JUDGE_QUESTIONS[item.question] },
    timeoutMs: EVAL_TIMEOUT_MS,
  });
  const answer = answers.answer;
  const probability = answer?.kind === JudgeKind.noul ? answer.probability : null;
  return { item, probability, latencyMs: performance.now() - started };
}

function report(question: JudgeQuestionId, entries: readonly Scored[]): QuestionReport {
  const answered = entries.filter(
    (entry): entry is Scored & { probability: number } => entry.probability !== null,
  );
  const needsFullRecall = FULL_RECALL_QUESTIONS.has(question);
  const best = bestThreshold(answered, needsFullRecall);
  const brier =
    answered.reduce(
      (total, entry) => total + squared(entry.probability - Number(entry.item.label)),
      0,
    ) / Math.max(answered.length, 1);
  const misses = answered
    .filter((entry) => entry.probability >= best.threshold !== entry.item.label)
    .map(
      (entry) =>
        `${entry.item.label ? 'falso negativo' : 'falso positivo'} (${entry.probability.toFixed(PROBABILITY_DIGITS)}): ${Object.values(entry.item.state).join(' / ')}`,
    );
  const unanswered = entries.length - answered.length;
  return {
    question,
    cases: entries.length,
    unanswered,
    accuracyAtDefault:
      accuracy(answered, DEFAULT_THRESHOLD) * (answered.length / Math.max(entries.length, 1)),
    ...best,
    brier,
    passed:
      unanswered === 0 && best.accuracy >= PASS_ACCURACY && (!needsFullRecall || best.recall === 1),
    misses,
  };
}

function bestThreshold(
  entries: readonly (Scored & { probability: number })[],
  needsFullRecall: boolean,
) {
  const candidates = Array.from(
    { length: THRESHOLD_STEPS },
    (_, index) => (index + 1) * THRESHOLD_STEP,
  ).map((threshold) => ({
    threshold,
    accuracy: accuracy(entries, threshold),
    recall: recall(entries, threshold),
  }));
  const eligible = needsFullRecall
    ? candidates.filter((candidate) => candidate.recall === 1)
    : candidates;
  const pool = eligible.length ? eligible : candidates;
  // Highest accuracy; on a tie, the middle of the tied range: the most margin on both sides.
  const top = Math.max(...pool.map((candidate) => candidate.accuracy));
  const tied = pool.filter((candidate) => candidate.accuracy === top);
  const middle = tied[Math.floor(tied.length / HALVES)];
  if (!middle) throw new Error('no threshold candidates');
  return middle;
}

function accuracy(
  entries: readonly (Scored & { probability: number })[],
  threshold: number,
): number {
  return (
    entries.filter((entry) => entry.probability >= threshold === entry.item.label).length /
    Math.max(entries.length, 1)
  );
}

function recall(entries: readonly (Scored & { probability: number })[], threshold: number): number {
  const positives = entries.filter((entry) => entry.item.label);
  return (
    positives.filter((entry) => entry.probability >= threshold).length /
    Math.max(positives.length, 1)
  );
}

function squared(value: number): number {
  return value * value;
}

export function percentile(sorted: readonly number[], fraction: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}
