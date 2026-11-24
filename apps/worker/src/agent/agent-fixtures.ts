import { randomUUID } from 'node:crypto';
import { createAiGateway, DEFAULT_ROUTES, PRICE_TABLE, Provider, Task } from '@app/ai';
import {
  Autonomy,
  createDb,
  IdentityMode,
  MessageAuthor,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '@app/db';
import { MockLanguageModelV3 } from 'ai/test';
import { createConversationAgent } from './respond.ts';

// E-13 with a fake model: no provider is called and nothing is billed.

export const db = createDb(process.env.DATABASE_URL ?? '');

const usage = {
  inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 10, text: 10, reasoning: 0 },
};
const finish = (unified: 'stop' | 'tool-calls') => ({ unified, raw: unified });
type Step = { text: string } | { tool: string; input: object };

/** A fake model that plays the given steps in order and records what it was sent. */
export function scripted(steps: Step[]) {
  const prompts: unknown[] = [];
  const model = new MockLanguageModelV3({
    doGenerate: (options) => {
      prompts.push(options.prompt);
      const step = steps.shift() ?? { text: 'ok' };
      if ('tool' in step) {
        return Promise.resolve({
          finishReason: finish('tool-calls'),
          usage,
          warnings: [],
          content: [
            {
              type: 'tool-call',
              toolCallId: randomUUID(),
              toolName: step.tool,
              input: JSON.stringify(step.input),
            },
          ],
        });
      }
      return Promise.resolve({
        finishReason: finish('stop'),
        usage,
        warnings: [],
        content: [{ type: 'text', text: step.text }],
      });
    },
  });
  return { model, prompts };
}

const OPEN_CAPS = { turn: 1_000_000n, conversation: 1_000_000n, tenantMonth: 1_000_000n };

/** judge: probability per question key the agent asks (urgent, clinical); absent = Jev down. */
export function agentWith(
  model: MockLanguageModelV3,
  { caps = OPEN_CAPS, judge }: { caps?: typeof OPEN_CAPS; judge?: Record<string, number> } = {},
) {
  const gateway = createAiGateway({
    routes: {
      ...DEFAULT_ROUTES,
      [Task.conversation]: { primary: { provider: Provider.openai, model: 'gpt-6-luna' } },
    },
    resolver: {
      language: () => model,
      transcription: () => {
        throw new Error('not used');
      },
    },
    prices: PRICE_TABLE,
    caps,
    store: {
      record: () => Promise.resolve(),
      spend: () => Promise.resolve({ turn: 0n, conversation: 0n, tenantMonth: 0n }),
    },
    judgeProvider: {
      ask: ({ questions }) =>
        judge
          ? Promise.resolve({
              answers: Object.fromEntries(
                Object.keys(questions).map((id) => [
                  id,
                  { kind: 'noul', probability: judge[id] ?? 0 },
                ]),
              ),
              usage: { inputTokens: 10, outputTokens: 0 },
            })
          : Promise.reject(new Error('Jev down')),
    },
  });
  return createConversationAgent({ db, gateway, now: () => new Date('2027-01-04T12:00:00Z') });
}

export async function conversation({
  autonomy = Autonomy.auto,
  answered = false,
  identityMode = IdentityMode.assistant,
}: { autonomy?: Autonomy; answered?: boolean; identityMode?: IdentityMode } = {}) {
  const tenant = await db.client.tenant.create({
    data: {
      name: 'Agente (fictício)',
      slug: `ag-${randomUUID()}`,
      autonomy,
      identityMode,
      assistantName: 'Lia',
    },
  });
  const tenantId = tenant.id;
  return db.withTenant(tenantId, async (tx) => {
    await tx.professional.create({ data: { tenantId, name: 'Dr. Rafael Exemplo' } });
    await tx.service.create({
      data: { tenantId, name: 'Avaliação', durationMinutes: 60, priceCents: 18_000 },
    });
    const channel = await tx.channel.create({ data: { tenantId, kind: 'cloud_api' } });
    const contact = await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } });
    const conv = await tx.conversation.create({
      data: { tenantId, channelId: channel.id, contactId: contact.id },
    });
    const base = {
      tenantId,
      channelId: channel.id,
      conversationId: conv.id,
      type: MessageType.text,
    };
    if (answered)
      await tx.message.create({
        data: {
          ...base,
          direction: MessageDirection.outbound,
          author: MessageAuthor.ai,
          text: 'Oi, aqui é a Lia.',
          status: MessageStatus.sent,
        },
      });
    const message = await tx.message.create({
      data: {
        ...base,
        direction: MessageDirection.inbound,
        author: MessageAuthor.patient,
        text: 'oi',
        status: MessageStatus.received,
      },
    });
    return { tenantId, conversationId: conv.id, contactId: contact.id, message };
  });
}

export const turnOf = (
  scope: { tenantId: string; conversationId: string },
  texts: (string | null)[],
  type: MessageType = MessageType.text,
) => ({
  ...scope,
  turnId: randomUUID(),
  messages: texts.map((text) => ({ id: randomUUID(), type, text })),
});
