import {
  BudgetExceededError,
  JUDGE_QUESTIONS,
  JUDGE_THRESHOLDS,
  JudgeKind,
  JudgeQuestionId,
  modelKey,
  type AiGateway,
} from '@app/ai';
import {
  AgentCopy,
  generateChecked,
  identified,
  introducedAfter,
  prefilter,
  PrefilterKind,
} from '@app/agent';
import {
  Autonomy,
  ConsentActor,
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  recordConsent,
  type Db,
} from '@app/db';
import { DeliveryMode, type RespondInput, type TurnReply } from '../conversation/turn.ts';
import { loadAgentInput, type AgentInput } from './context.ts';
import { refreshSummary } from './summary.ts';
import { conversationTools, type ToolEffects } from './tools.ts';

// Spec 04, "Fluxo de um turno": pre-filters, context, one model call with tools, limits.

const NO_MODEL = 'none';
const NO_COST = 0n;

export interface AgentDeps {
  db: Db;
  gateway: AiGateway;
  now?: () => Date;
  /** Web Push keys are configured; without them no professional can be warned. */
  pushEnabled?: boolean;
}

export function createConversationAgent(
  deps: AgentDeps,
): (input: RespondInput) => Promise<TurnReply | null> {
  return async (turn) => {
    const now = deps.now?.() ?? new Date();
    let input = await deps.db.withTenant(turn.tenantId, (tx) =>
      loadAgentInput(tx, turn.conversationId, now),
    );
    const urgent = urgentReply(await canWarn(deps, turn.tenantId));
    const prefiltered = await applyPrefilter(deps.db, turn, { input, urgent });
    // null (nothing to answer) is a decision too; only undefined goes on to the judge.
    const filtered =
      prefiltered === undefined ? await judgedUrgency(deps.gateway, turn, urgent) : prefiltered;
    if (filtered !== undefined) return filtered && introducedReply(filtered, input);
    if (input.autonomy === Autonomy.off)
      return introducedReply(fixed(AgentCopy.away(input.profile), false), input);
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
  urgent: TurnReply,
): Promise<TurnReply | undefined> {
  const mensagem = turn.messages
    .map((message) => message.text ?? '')
    .join('\n')
    .trim();
  if (!mensagem) return undefined;
  const { urgent: judged } = await gateway.judge(turn, {
    state: { mensagem },
    questions: { urgent: JUDGE_QUESTIONS[JudgeQuestionId.urgent] },
  });
  const isUrgent =
    judged?.kind === JudgeKind.noul &&
    judged.probability >= JUDGE_THRESHOLDS[JudgeQuestionId.urgent];
  return isUrgent ? urgent : undefined;
}

/** undefined: go on to the model. null or a reply: the pre-filter decided. */
async function applyPrefilter(
  db: Db,
  turn: RespondInput,
  { input, urgent }: { input: AgentInput; urgent: TurnReply },
): Promise<TurnReply | null | undefined> {
  const { kind } = prefilter(turn.messages, input.specialtyTerms);
  if (kind === PrefilterKind.urgency) return urgent;
  if (kind === PrefilterKind.ignore) return null;
  if (kind === PrefilterKind.unsupported) return fixed(AgentCopy.unsupported, false);
  if (kind === PrefilterKind.optOut) {
    await db.withTenant(turn.tenantId, (tx) =>
      recordConsent(tx, {
        tenantId: turn.tenantId,
        contactId: input.contactId,
        kind: ConsentKind.opt_out,
        category: ConsentCategory.all,
        source: ConsentSource.patient_message,
        actor: { type: ConsentActor.contact },
        now: new Date(),
      }),
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
    const tools = conversationTools(
      {
        db: deps.db,
        tenantId: turn.tenantId,
        contactId: input.contactId,
        conversationId: turn.conversationId,
        turnId: turn.turnId,
        now: deps.now?.() ?? new Date(),
        timezone: input.timezone,
        effects,
      },
      input.plan,
    );
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

/** Fixed answers keep their message first (SAMU before anything) and introduce after. */
function introducedReply(reply: TurnReply, input: AgentInput): TurnReply {
  return { ...reply, text: introducedAfter(reply.text, input) };
}

function urgentReply(notified: boolean): TurnReply {
  return { ...fixed(AgentCopy.emergency(notified), true), urgent: true };
}

/** The emergency answer may only say "já avisei" when a push can really reach someone. */
async function canWarn(deps: AgentDeps, tenantId: string): Promise<boolean> {
  if (!deps.pushEnabled) return false;
  const devices = await deps.db.withTenant(tenantId, (tx) => tx.pushSubscription.count());
  return devices > 0;
}

/** Deterministic answers skip approval: an emergency message must not wait for a draft. */
function fixed(text: string, handoff: boolean): TurnReply {
  return { text, model: NO_MODEL, costMicroUsd: NO_COST, mode: DeliveryMode.send, handoff };
}
