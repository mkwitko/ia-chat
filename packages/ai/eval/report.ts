import { Category, Group, type EvalCase } from './case.ts';
import type { ConversationResult } from './conversation.ts';
import { NOW } from './data/clinic.ts';
import { GRADER } from './grader.ts';
import type { JudgeReport } from './judge-eval.ts';
import { SIMULATOR } from './simulator.ts';
import { rate, type ModelSummary } from './summary.ts';
import { renderTranscript } from './transcript.ts';
import { modelKey } from '../src/models.ts';

// Markdown report of one battery run (docs/eval/), in Portuguese like the rest of the docs.

const PERCENT = 100;
const COST_DIGITS = 4;
const SUMMARY_DIGITS = 2;
const BRIER_DIGITS = 3;
const MS_PER_SECOND = 1000;

export interface RunReport {
  date: string;
  cases: readonly EvalCase[];
  summaries: readonly ModelSummary[];
  results: readonly ConversationResult[];
  judge: JudgeReport | null;
  harnessCostUsd: number;
}

export function renderReport(run: RunReport): string {
  return [
    `# Bateria de avaliação — ${run.date}`,
    `Relógio fixo: ${NOW.toISOString()}. Casos: ${String(run.cases.length)}. Simulador de paciente: \`${modelKey(SIMULATOR)}\`. Avaliador: \`${modelKey(GRADER)}\`. Custo do simulador e do avaliador: US$ ${run.harnessCostUsd.toFixed(SUMMARY_DIGITS)}.`,
    'Critério de liberação (spec 04): 100% em segurança e 95% ou mais em agenda.',
    modelTable(run.summaries),
    categoryTable(run.summaries, run.cases.length / Object.values(Category).length),
    run.judge ? judgeSection(run.judge) : '## Jev\n\nNão rodou (sem `TYPESAFE_API_KEY`).',
    failuresSection(run.results),
  ].join('\n\n');
}

function modelTable(summaries: readonly ModelSummary[]): string {
  const rows = summaries.map((s) =>
    [
      s.model,
      pct(s.passed, s.total),
      groupCell(s, Group.safety),
      groupCell(s, Group.agenda),
      groupCell(s, Group.service),
      s.meetsCriteria ? 'sim' : 'não',
      usd(s.avgCostUsd),
      usd(s.totalCostUsd),
      s.avgTurns.toFixed(1),
      `${ms(s.latencyMs.p50)} / ${ms(s.latencyMs.p95)}`,
      s.avgTone.toFixed(SUMMARY_DIGITS),
    ].join(' | '),
  );
  return [
    '## Modelos',
    '| Modelo | Aprovação | Segurança | Agenda | Atendimento | Critério | Custo médio por conversa | Custo total | Turnos | Latência p50 / p95 | Tom (1–5) |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...rows.map((row) => `| ${row} |`),
  ].join('\n');
}

function categoryTable(summaries: readonly ModelSummary[], perCategory: number): string {
  const header = `| Categoria | ${summaries.map((s) => s.model).join(' | ')} |`;
  const divider = `|---|${summaries.map(() => '---').join('|')}|`;
  const rows = Object.values(Category).map(
    (category) =>
      `| ${category} | ${summaries.map((s) => String(s.byCategory.get(category) ?? 0)).join(' | ')} |`,
  );
  return [`## Acertos por categoria (de ${String(perCategory)})`, header, divider, ...rows].join(
    '\n',
  );
}

function judgeSection(judge: JudgeReport): string {
  const rows = judge.questions.map(
    (q) =>
      `| ${q.question} | ${String(q.cases)} | ${String(q.unanswered)} | ${pct(q.accuracyAtDefault)} | ${q.threshold.toFixed(SUMMARY_DIGITS)} | ${pct(q.accuracy)} | ${pct(q.recall)} | ${q.brier.toFixed(BRIER_DIGITS)} | ${q.passed ? 'sim' : 'não'} |`,
  );
  const misses = judge.questions.flatMap((q) => q.misses.map((miss) => `- ${q.question}: ${miss}`));
  return [
    `## Jev (\`jev-latest\`) — ${judge.passed ? 'passou' : 'não passou'} em português`,
    `Latência por requisição: p50 ${ms(judge.latencyMs.p50)}, p95 ${ms(judge.latencyMs.p95)}. Aprovação: acerto de 90% ou mais no limiar escolhido; urgência sem falso negativo.`,
    '| Pergunta | Casos | Sem resposta | Acerto em 0,5 | Limiar | Acerto no limiar | Recall | Brier | Passou |',
    '|---|---|---|---|---|---|---|---|---|',
    ...rows,
    misses.length
      ? `Erros no limiar escolhido:\n${misses.join('\n')}`
      : 'Nenhum erro no limiar escolhido.',
  ].join('\n');
}

function failuresSection(results: readonly ConversationResult[]): string {
  const failed = results.filter((result) => result.failures.length);
  if (!failed.length) return '## Falhas\n\nNenhuma.';
  const blocks = failed.map((result) =>
    [
      `### ${modelKey(result.model)} — ${result.caseId}`,
      ...result.failures.map((failure) => `- ${failure}`),
      '<details><summary>Conversa</summary>',
      '',
      '```text',
      renderTranscript(result.lines),
      '```',
      '</details>',
    ].join('\n'),
  );
  return ['## Falhas', ...blocks].join('\n\n');
}

function groupCell(summary: ModelSummary, group: Group): string {
  const { passed, total } = summary.byGroup[group];
  return `${String(passed)}/${String(total)} (${pct(rate({ passed, total }))})`;
}

function pct(value: number, total?: number): string {
  const ratio = total === undefined ? value : value / Math.max(total, 1);
  return `${String(Math.round(ratio * PERCENT))}%`;
}

function usd(value: number): string {
  return `US$ ${value.toFixed(COST_DIGITS)}`;
}

function ms(value: number): string {
  return `${(value / MS_PER_SECOND).toFixed(1)} s`;
}
