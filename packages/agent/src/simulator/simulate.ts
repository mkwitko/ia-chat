import { BudgetExceededError, type AiGateway } from '@app/ai';
import { Autonomy, MessageType, Plan, type Db } from '@app/db';
import type { ModelMessage, ToolSet } from 'ai';
import { randomUUID } from 'node:crypto';
import { availabilityTool } from '../agenda-availability.ts';
import { generateChecked } from '../checked.ts';
import { AgentCopy } from '../copy.ts';
import { identified, introducedAfter } from '../identity.ts';
import type { AgentInput } from '../input.ts';
import { prefilter, PrefilterKind } from '../prefilter.ts';
import { loadTenantContext } from '../profile.ts';
import { AgendaToolName, handoffTool, ToolName, unansweredTool } from '../shared-tools.ts';
import { buildState } from '../state.ts';
import { sourcesOf, type Source } from './sources.ts';

// Spec 10, "Simulador": the configured assistant on a throwaway chat. Same pre-filters, same
// prompt, same output checks as a real turn, but nothing is read from or written to a
// conversation, no patient exists, and the agenda tools only look (no booking tools at all).

export const SimRole = { patient: 'patient', assistant: 'assistant' } as const;
export type SimRole = (typeof SimRole)[keyof typeof SimRole];

export interface SimulatedMessage {
  role: SimRole;
  text: string;
}

export interface SimulationReply {
  text: string;
  /** Fixed answers (emergency, opt-out, away) come from code, with no model call. */
  fixed: boolean;
  handoff: boolean;
  sources: Source[];
}

export interface SimulatorDeps {
  db: Db;
  gateway: AiGateway;
  now?: () => Date;
}

/** Same window as a real conversation (spec 04): the last 20 messages. */
const HISTORY_LIMIT = 20;
const NO_SOURCES: Source[] = [];

/** The last message is the patient's; the ones before it are the chat so far. */
export async function simulateTurn(
  deps: SimulatorDeps,
  request: { tenantId: string; messages: readonly SimulatedMessage[] },
): Promise<SimulationReply> {
  const now = deps.now?.() ?? new Date();
  const tenant = await deps.db.withTenant(request.tenantId, (tx) =>
    loadTenantContext(tx, request.tenantId),
  );
  const chat = request.messages.slice(-HISTORY_LIMIT);
  const input: AgentInput = {
    ...tenant,
    state: buildState({
      now,
      timezone: tenant.timezone,
      contactName: undefined,
      firstMessage: !chat.some((message) => message.role === SimRole.assistant),
      summary: null,
    }),
    history: chat.map(toModelMessage),
  };
  const fixed = fixedReply(input, chat.at(-1)?.text ?? '');
  if (fixed)
    return {
      text: introducedAfter(fixed, input),
      fixed: true,
      handoff: false,
      sources: NO_SOURCES,
    };
  return generate(deps, { input, now });
}

function toModelMessage({ role, text }: SimulatedMessage): ModelMessage {
  return { role: role === SimRole.patient ? 'user' : 'assistant', content: text };
}

/** Pre-filter answers and the autonomy "off" notice: no model involved. */
function fixedReply(input: AgentInput, last: string): string | undefined {
  const { kind } = prefilter([{ type: MessageType.text, text: last }], input.specialtyTerms);
  // The simulator warns nobody, so it shows the answer that promises no warning.
  if (kind === PrefilterKind.urgency) return AgentCopy.emergency(false);
  if (kind === PrefilterKind.optOut) return AgentCopy.optOutConfirmation;
  if (input.autonomy === Autonomy.off) return AgentCopy.away(input.profile);
  return undefined;
}

async function generate(
  deps: SimulatorDeps,
  { input, now }: { input: AgentInput; now: Date },
): Promise<SimulationReply> {
  const effects = { handoff: false };
  const tools = simulatorTools(deps.db, { input, now, effects });
  try {
    const checked = await generateChecked({
      gateway: deps.gateway,
      turn: { tenantId: input.tenantId },
      input,
      tools,
    });
    if (!checked.ok) return handoffNotice(input);
    const { text, messages } = checked.result;
    return {
      text: identified(text, input),
      fixed: false,
      handoff: effects.handoff,
      sources: sourcesOf({ text, messages }, input.profile),
    };
  } catch (error) {
    if (error instanceof BudgetExceededError) return handoffNotice(input);
    throw error;
  }
}

function handoffNotice(input: AgentInput): SimulationReply {
  return {
    text: AgentCopy.handoffNotice(input.profile),
    fixed: true,
    handoff: true,
    sources: NO_SOURCES,
  };
}

/** Nothing here writes: the handoff and unanswered tools only mark what would happen. */
function simulatorTools(
  db: Db,
  { input, now, effects }: { input: AgentInput; now: Date; effects: { handoff: boolean } },
): ToolSet {
  const essential = {
    [ToolName.handoff]: handoffTool(effects),
    [ToolName.unanswered]: unansweredTool(() => Promise.resolve()),
  };
  if (input.plan === Plan.essencial) return essential;
  // record: false leaves no offered slots behind; the conversation id is never stored.
  const context = { db, tenantId: input.tenantId, conversationId: randomUUID(), now };
  return { ...essential, [AgendaToolName.availability]: availabilityTool(context, false) };
}
