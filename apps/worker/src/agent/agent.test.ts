import { randomUUID } from 'node:crypto';
import { createAiGateway, DEFAULT_ROUTES, PRICE_TABLE, Provider, Task } from '@app/ai';
import {
  Autonomy,
  createDb,
  KnowledgeSource,
  MessageAuthor,
  MessageDirection,
  MessageStatus,
  MessageType,
} from '@app/db';
import { MockLanguageModelV3 } from 'ai/test';
import { afterAll, describe, expect, it } from 'vitest';
import { AgentCopy } from './copy.ts';
import { createConversationAgent } from './respond.ts';
import { ToolName } from './tools.ts';

// E-13 with a fake model: no provider is called and nothing is billed.

const db = createDb(process.env.DATABASE_URL ?? '');
afterAll(() => db.client.$disconnect());

const usage = {
  inputTokens: { total: 100, noCache: 100, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 10, text: 10, reasoning: 0 },
};
const finish = (unified: 'stop' | 'tool-calls') => ({ unified, raw: unified });
type Step = { text: string } | { tool: string; input: object };

/** A fake model that plays the given steps in order and records what it was sent. */
function scripted(steps: Step[]) {
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

function agentWith(
  model: MockLanguageModelV3,
  caps = { turn: 1_000_000n, conversation: 1_000_000n, tenantMonth: 1_000_000n },
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
    judgeProvider: { ask: () => Promise.reject(new Error('not used')) },
  });
  return createConversationAgent({ db, gateway, now: () => new Date('2027-01-04T12:00:00Z') });
}

async function conversation({
  autonomy = Autonomy.auto,
  answered = false,
}: { autonomy?: Autonomy; answered?: boolean } = {}) {
  const tenant = await db.client.tenant.create({
    data: { name: 'Agente (fictício)', slug: `ag-${randomUUID()}`, autonomy, assistantName: 'Lia' },
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

const turnOf = (
  scope: { tenantId: string; conversationId: string },
  texts: (string | null)[],
  type: MessageType = MessageType.text,
) => ({
  ...scope,
  turnId: randomUUID(),
  messages: texts.map((text) => ({ id: randomUUID(), type, text })),
});

describe('conversation agent (E-13)', () => {
  it('answers urgency with the fixed emergency message and hands off, with no model call', async () => {
    const scope = await conversation({ autonomy: Autonomy.approve });
    const fake = scripted([]);
    const reply = await agentWith(fake.model)(turnOf(scope, ['to com dor no peito agora']));
    expect(reply).toMatchObject({
      text: `${AgentCopy.emergency} Aqui é Lia, assistente virtual do consultório de Dr. Rafael Exemplo.`,
      handoff: true,
      mode: 'send',
      model: 'none',
    });
    expect(fake.prompts).toHaveLength(0);
  });

  it('registers opt-out and ignores a lone sticker without calling the model', async () => {
    const scope = await conversation();
    const fake = scripted([]);
    expect(await agentWith(fake.model)(turnOf(scope, ['SAIR']))).toMatchObject({
      text: `${AgentCopy.optOutConfirmation} Aqui é Lia, assistente virtual do consultório de Dr. Rafael Exemplo.`,
    });
    const contact = await db.withTenant(scope.tenantId, (tx) =>
      tx.contact.findUniqueOrThrow({ where: { id: scope.contactId } }),
    );
    expect(contact.optOutAt).not.toBeNull();
    expect(await agentWith(fake.model)(turnOf(scope, [null], MessageType.sticker))).toBeNull();
    expect(fake.prompts).toHaveLength(0);
  });

  it('introduces the assistant in the first answer and sends the catalog in the prompt', async () => {
    const scope = await conversation();
    const fake = scripted([{ text: 'Oi! A avaliação custa R$ 180,00.' }]);
    const reply = await agentWith(fake.model)(turnOf(scope, ['oi']));
    expect(reply?.text).toBe(
      'Oi! Aqui é Lia, assistente virtual do consultório de Dr. Rafael Exemplo. A avaliação custa R$ 180,00.',
    );
    expect(JSON.stringify(fake.prompts[0])).toContain('Avaliação (id:');
    expect(JSON.stringify(fake.prompts[0])).toContain('R$ 180,00');
  });

  it('uses a plain introduction while the tenant keeps the default assistant name', () => {
    expect(AgentCopy.identification('Assistente virtual', 'Dra. Ana Exemplo')).toBe(
      'Oi! Sou a assistente virtual do consultório de Dra. Ana Exemplo.',
    );
  });

  it('keeps the answer as a draft when the tenant approves before sending (RF-13)', async () => {
    const scope = await conversation({ autonomy: Autonomy.approve, answered: true });
    const reply = await agentWith(scripted([{ text: 'Tenho quinta às 15h.' }]).model)(
      turnOf(scope, ['tem horário?']),
    );
    expect(reply).toMatchObject({ text: 'Tenho quinta às 15h.', mode: 'draft', handoff: false });
  });

  it('marks the handoff and records the unanswered question through the tools', async () => {
    const scope = await conversation({ answered: true });
    const fake = scripted([
      { tool: ToolName.unanswered, input: { pergunta: 'tem wi-fi na sala de espera?' } },
      { tool: ToolName.handoff, input: { motivo: 'paciente quer falar com o profissional' } },
      { text: 'Vou passar para o Dr. Rafael.' },
    ]);
    const reply = await agentWith(fake.model)(
      turnOf(scope, ['tem wifi? e quero falar com o doutor']),
    );
    expect(reply).toMatchObject({ handoff: true, text: 'Vou passar para o Dr. Rafael.' });
    const items = await db.withTenant(scope.tenantId, (tx) => tx.knowledgeItem.findMany());
    expect(items).toMatchObject([
      {
        question: 'tem wi-fi na sala de espera?',
        source: KnowledgeSource.unanswered,
        active: false,
      },
    ]);
  });

  it('hands off with the fixed notice when the turn is over its cost cap', async () => {
    const scope = await conversation({ answered: true });
    const reply = await agentWith(scripted([{ text: 'nunca chega aqui' }]).model, {
      turn: 0n,
      conversation: 1_000_000n,
      tenantMonth: 1_000_000n,
    })(turnOf(scope, ['oi']));
    expect(reply).toMatchObject({ handoff: true, model: 'none' });
  });
});
