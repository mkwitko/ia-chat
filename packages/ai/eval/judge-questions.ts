import type { JudgeQuestionId } from '../src/agent/judgments.ts';

export { JUDGE_QUESTIONS, JudgeQuestionId } from '../src/agent/judgments.ts';

export interface LabeledJudgeCase {
  question: JudgeQuestionId;
  state: Readonly<Record<string, string>>;
  label: boolean;
}
