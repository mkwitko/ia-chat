import { BudgetExceededError, conversationBlocks, modelKey, Task, type AiGateway } from '@app/ai';
import { Autonomy, type Db } from '@app/db';
import { HANDOFF_NOTICE } from '../conversation/handoff.ts';
import { DeliveryMode, type RespondInput, type TurnReply } from '../conversation/turn.ts';
import { loadAgentInput, type AgentInput } from './context.ts';
import { AgentCopy } from './copy.ts';
import { prefilter, PrefilterKind } from './prefilter.ts';
import { refreshSummary } from './summary.ts';
import { essentialTools, type ToolEffects } from './tools.ts';

// Spec 04, "Fluxo de um turno": pre-filters, context, one model call with tools, limits.

const NO_MODEL = 'none';
const NO_COST = 0n;

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
    const filtered = await applyPrefilter(deps.db, turn, input);
    if (filtered !== undefined) return filtered;
    if (input.autonomy === Autonomy.off) return fixed(AgentCopy.away, false);
    await refreshSummary(deps.db, deps.gateway, turn);
    input = await deps.db.withTenant(turn.tenantId, (tx) =>
      loadAgentInput(tx, turn.conversationId, now),
    );
    return generate(deps, { turn, input });
  };
}

/** undefined: go on to the model. null or a reply: the pre-filter decided. */
async function applyPrefilter(
  db: Db,
  turn: RespondInput,
  input: AgentInput,
): Promise<TurnReply | null | undefined> {
  const { kind } = prefilter(turn.messages, input.specialtyTerms);
  if (kind === PrefilterKind.urgency) return fixed(AgentCopy.emergency, true);
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
    const result = await deps.gateway.generate({
      task: Task.conversation,
      tenantId: turn.tenantId,
      conversationId: turn.conversationId,
      turnId: turn.turnId,
      system: conversationBlocks(input.profile, input.state),
      messages: input.history,
      tools: essentialTools({
        db: deps.db,
        tenantId: turn.tenantId,
        contactId: input.contactId,
        effects,
      }),
      personalNames: input.personalNames,
    });
    return {
      text: identified(result.text, input),
      model: modelKey(result.model),
      costMicroUsd: result.costMicroUsd,
      mode: input.autonomy === Autonomy.approve ? DeliveryMode.draft : DeliveryMode.send,
      handoff: effects.handoff,
    };
  } catch (error) {
    // Spec 04: a turn or conversation over its cost cap goes to the professional.
    if (error instanceof BudgetExceededError) return fixed(HANDOFF_NOTICE, true);
    throw error;
  }
}

/** Spec 04, "Identificação": the first answer of a conversation always introduces the assistant. */
function identified(text: string, input: AgentInput): string {
  if (!input.state.firstMessage || text.includes(input.profile.assistantName)) return text;
  return `${AgentCopy.identification(input.profile.assistantName, input.profile.professionalName)} ${text}`;
}

/** Deterministic answers skip approval: an emergency message must not wait for a draft. */
function fixed(text: string, handoff: boolean): TurnReply {
  return { text, model: NO_MODEL, costMicroUsd: NO_COST, mode: DeliveryMode.send, handoff };
}
