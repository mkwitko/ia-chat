import { realClock } from './clock.ts';
import type { TurnDeps, TurnMessage, TurnReply } from './turn-types.ts';

// Spec 03, "Execução do turno": typing while generating, refreshed once at 20 s; past
// 45 s the turn is aborted and a late answer is ignored.
const TYPING_REFRESH_MS = 20_000;
const ABORT_MS = 45_000;

export type Generated = { aborted: false; reply: TurnReply | null } | { aborted: true };

export interface Generation {
  tenantId: string;
  conversationId: string;
  turnId: string;
  messages: readonly TurnMessage[];
  lastProviderMessageId: string | null;
}

export async function generateInTime(deps: TurnDeps, input: Generation): Promise<Generated> {
  const clock = deps.clock ?? realClock;
  const typing = async () => {
    if (!input.lastProviderMessageId || !deps.typing) return;
    // A failed indicator never blocks the answer.
    await deps
      .typing({
        tenantId: input.tenantId,
        conversationId: input.conversationId,
        providerMessageId: input.lastProviderMessageId,
      })
      .catch(() => undefined);
  };
  await typing();
  let abort: () => void = () => undefined;
  const aborted = new Promise<Generated>((resolve) => {
    abort = () => {
      resolve({ aborted: true });
    };
  });
  const cancelRefresh = clock.after(TYPING_REFRESH_MS, () => void typing());
  const cancelAbort = clock.after(ABORT_MS, abort);
  const answer = deps.respond({
    tenantId: input.tenantId,
    conversationId: input.conversationId,
    turnId: input.turnId,
    messages: input.messages,
  });
  answer.catch(() => undefined); // a failure after the abort is no longer anyone's business
  try {
    return await Promise.race([
      answer.then((reply): Generated => ({ aborted: false, reply })),
      aborted,
    ]);
  } finally {
    cancelRefresh();
    cancelAbort();
  }
}
