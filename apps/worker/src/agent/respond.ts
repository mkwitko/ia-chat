import {
  BudgetExceededError,
  Identity,
  JUDGE_QUESTIONS,
  JUDGE_THRESHOLDS,
  JudgeKind,
  JudgeQuestionId,
  modelKey,
  type AiGateway,
} from '@app/ai';
import { Autonomy, type Db } from '@app/db';
import { DeliveryMode, type RespondInput, type TurnReply } from '../conversation/turn.ts';
import { generateChecked } from './checked.ts';
import { loadAgentInput, type AgentInput } from './context.ts';
import { AgentCopy } from './copy.ts';
import { prefilter, PrefilterKind } from './prefilter.ts';
import { refreshSummary } from './summary.ts';
import { essentialTools, type ToolEffects } from './tools.ts';

// Spec 04, "Fluxo de um turno": pre-filters, context, one model call with tools, limits.

const NO_MODEL = 'none';
const NO_COST = 0n;
// The model already introduced itself when the answer holds the mode's key words.
const INTRO_MARKER: Readonly<Record<Identity, string>> = {
  [Identity.assistant]: 'assistente virtual',
  [Identity.clinic]: 'consultório de',
  [Identity.professional]: '',
};
// The intro already greets: drop the model's own "Oi!" or "Olá," at the start.
const LEADING_GREETING = /^(?:oi|olá|ola|bom dia|boa tarde|boa noite)[!,.]?\s*/i;

export interface AgentDeps {
  db: Db;
  gateway: AiGateway;
  now?: () => Date;
}

export function createConversationAgent(
  deps: AgentDeps,
): (input: RespondInput) => Promise<TurnReply | null> {
  return async (turn) => {
    const now = deps.now?.() ?? new Date();
    let input = await deps.db.withTenant(turn.tenantId, (tx) =>
      loadAgentInput(tx, turn.conversationId, now),
    );
    const prefiltered = await applyPrefilter(deps.db, turn, input);
    // null (nothing to answer) is a decision too; only undefined goes on to the judge.
    const filtered =
      prefiltered === undefined ? await judgedUrgency(deps.gateway, turn) : prefiltered;
    if (filtered !== undefined) return filtered && introducedAfter(filtered, input);
    if (input.autonomy === Autonomy.off)
      return introducedAfter(fixed(AgentCopy.away(input.profile), false), input);
    await refreshSummary(deps.db, deps.gateway, turn);
    input = await deps.db.withTenant(turn.tenantId, (tx) =>
      loadAgentInput(tx, turn.conversationId, now),
    );
    return generate(deps, { turn, input });
  };
}

/** Jev complements the word list (spec 04); unavailable or below the threshold: go on. */
async function judgedUrgency(
  gateway: AiGateway,
  turn: RespondInput,
): Promise<TurnReply | undefined> {
  const mensagem = turn.messages
    .map((message) => message.text ?? '')
    .join('\n')
    .trim();
  if (!mensagem) return undefined;
  const { urgent } = await gateway.judge(turn, {
    state: { mensagem },
    questions: { urgent: JUDGE_QUESTIONS[JudgeQuestionId.urgent] },
  });
  const isUrgent =
    urgent?.kind === JudgeKind.noul &&
    urgent.probability >= JUDGE_THRESHOLDS[JudgeQuestionId.urgent];
  return isUrgent ? urgentReply() : undefined;
}

/** undefined: go on to the model. null or a reply: the pre-filter decided. */
async function applyPrefilter(
  db: Db,
  turn: RespondInput,
  input: AgentInput,
): Promise<TurnReply | null | undefined> {
  const { kind } = prefilter(turn.messages, input.specialtyTerms);
  if (kind === PrefilterKind.urgency) return urgentReply();
  if (kind === PrefilterKind.ignore) return null;
  if (kind === PrefilterKind.unsupported) return fixed(AgentCopy.unsupported, false);
  if (kind === PrefilterKind.optOut) {
    await db.withTenant(turn.tenantId, (tx) =>
      tx.contact.update({ where: { id: input.contactId }, data: { optOutAt: new Date() } }),
    );
    return fixed(AgentCopy.optOutConfirmation, false);
  }
  return undefined;
}

async function generate(
  deps: AgentDeps,
  { turn, input }: { turn: RespondInput; input: AgentInput },
): Promise<TurnReply> {
  const effects: ToolEffects = { handoff: false };
  try {
    const tools = essentialTools({
      db: deps.db,
      tenantId: turn.tenantId,
      contactId: input.contactId,
      effects,
    });
    const checked = await generateChecked({ gateway: deps.gateway, turn, input, tools });
    // Spec 04: failed the checks twice; the professional answers instead.
    if (!checked.ok) return fixed(AgentCopy.handoffNotice(input.profile), true);
    const { result } = checked;
    return {
      text: identified(result.text, input),
      model: modelKey(result.model),
      costMicroUsd: result.costMicroUsd,
      mode: input.autonomy === Autonomy.approve ? DeliveryMode.draft : DeliveryMode.send,
      handoff: effects.handoff,
    };
  } catch (error) {
    // Spec 04: a turn or conversation over its cost cap goes to the professional.
    if (error instanceof BudgetExceededError)
      return fixed(AgentCopy.handoffNotice(input.profile), true);
    throw error;
  }
}

/** Spec 04, "Identificação": the first answer of a conversation always introduces the assistant. */
function identified(text: string, input: AgentInput): string {
  const intro = AgentCopy.identification(input.profile);
  if (
    !input.state.firstMessage ||
    !intro ||
    text.toLowerCase().includes(INTRO_MARKER[input.profile.identity])
  )
    return text;
  return `${intro} ${text.replace(LEADING_GREETING, '')}`;
}

/** Fixed answers keep their message first (SAMU before anything) and introduce after. */
function introducedAfter(reply: TurnReply, input: AgentInput): TurnReply {
  const intro = AgentCopy.identification(input.profile);
  if (!input.state.firstMessage || !intro) return reply;
  return { ...reply, text: `${reply.text} ${intro.replace(LEADING_GREETING, '')}` };
}

function urgentReply(): TurnReply {
  return { ...fixed(AgentCopy.emergency, true), urgent: true };
}

/** Deterministic answers skip approval: an emergency message must not wait for a draft. */
function fixed(text: string, handoff: boolean): TurnReply {
  return { text, model: NO_MODEL, costMicroUsd: NO_COST, mode: DeliveryMode.send, handoff };
}
