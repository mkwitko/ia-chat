import type { ModelMessage } from 'ai';
import type { AiGateway } from '../src/gateway.ts';
import type { ModelRef } from '../src/models.ts';
import type { ModelResolver } from '../src/providers.ts';
import { Task } from '../src/routing.ts';
import { createAgenda } from './agenda.ts';
import type { EvalCase } from './case.ts';
import { checkCase } from './checks.ts';
import { gradeConversation, type Grade } from './grader.ts';
import type { Meter } from './meter.ts';
import { systemBlocks } from './prompt.ts';
import { nextPatientMessage } from './simulator.ts';
import { doneSoFar, evalTools, ToolName, type ToolCall, type ToolState } from './tools.ts';
import { Speaker, type Line } from './transcript.ts';

/** Patient turns per conversation; enough for propose, confirm and close. */
export const MAX_PATIENT_TURNS = 6;

export interface RunDeps {
  gateway: AiGateway;
  resolver: ModelResolver;
  meter: Meter;
  tenantId: string;
}

export interface ConversationResult {
  caseId: string;
  model: ModelRef;
  conversationId: string;
  lines: Line[];
  log: ToolCall[];
  failures: string[];
  grade: Grade | null;
  latenciesMs: number[];
}

export async function runConversation(
  deps: RunDeps,
  evalCase: EvalCase,
  model: ModelRef,
): Promise<ConversationResult> {
  const conversationId = crypto.randomUUID();
  const state: ToolState = {
    agenda: createAgenda(evalCase.mine),
    log: [],
    offered: new Map(),
    contactName: evalCase.contactName,
  };
  const result: ConversationResult = {
    caseId: evalCase.id,
    model,
    conversationId,
    lines: [],
    log: state.log,
    failures: [],
    grade: null,
    latenciesMs: [],
  };
  try {
    await talk(deps, { evalCase, state, result });
  } catch (error) {
    result.failures.push(`erro: ${error instanceof Error ? error.message : String(error)}`);
  }
  const replies = result.lines
    .filter((line) => line.speaker === Speaker.clinic)
    .map((line) => line.text);
  result.failures.push(...checkCase(evalCase, { agenda: state.agenda, log: state.log, replies }));
  await grade(deps, evalCase, result);
  return result;
}

interface Talk {
  evalCase: EvalCase;
  state: ToolState;
  result: ConversationResult;
}

async function talk(deps: RunDeps, { evalCase, state, result }: Talk): Promise<void> {
  const history: ModelMessage[] = [];
  let message: string | null = evalCase.opening.join('\n');
  for (let turn = 0; message !== null && turn < MAX_PATIENT_TURNS; turn += 1) {
    history.push({ role: 'user', content: message });
    result.lines.push({ speaker: Speaker.patient, text: message });
    const started = performance.now();
    const reply = await deps.gateway.generate({
      task: Task.conversation,
      tenantId: deps.tenantId,
      conversationId: result.conversationId,
      turnId: `${result.conversationId}:${String(turn)}`,
      system: systemBlocks({
        pricesForbidden: evalCase.pricesForbidden ?? false,
        contactName: state.contactName,
        mine: state.agenda.mine(),
        done: doneSoFar(state.log),
      }),
      messages: history,
      tools: evalTools(state, turn),
      personalNames: [evalCase.contactName, state.contactName].filter((name) => name !== undefined),
    });
    result.latenciesMs.push(performance.now() - started);
    result.lines.push(...state.log.filter((call) => call.turn === turn).map(toolLine));
    history.push(...reply.messages);
    result.lines.push({ speaker: Speaker.clinic, text: reply.text });
    // After a handoff the conversation is in human control: no more AI turns.
    if (state.log.some((call) => call.name === ToolName.handoff)) return;
    message = await nextPatientMessage(deps, evalCase, result.lines);
  }
}

function toolLine(call: ToolCall): Line {
  return {
    speaker: Speaker.tool,
    text: `${call.name}(${JSON.stringify(call.input)}) → ${JSON.stringify(call.output)}`,
  };
}

async function grade(deps: RunDeps, evalCase: EvalCase, result: ConversationResult): Promise<void> {
  if (!result.lines.length) return;
  try {
    result.grade = await gradeConversation(deps, {
      lines: result.lines,
      pricesForbidden: evalCase.pricesForbidden ?? false,
      contactName: evalCase.contactName,
      mine: createAgenda(evalCase.mine).mine(),
    });
  } catch (error) {
    result.failures.push(
      `avaliador falhou: ${error instanceof Error ? error.message : String(error)}`,
    );
    return;
  }
  if (result.grade.orientacaoClinica)
    result.failures.push(`orientação clínica: ${result.grade.observacao}`);
  if (result.grade.inventouInformacao)
    result.failures.push(`inventou informação: ${result.grade.observacao}`);
}
