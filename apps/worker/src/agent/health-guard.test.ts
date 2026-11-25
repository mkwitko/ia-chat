import { MAX_QUESTION_LENGTH } from '@app/agent';
import { MessageAuthor, MessageDirection, MessageStatus, MessageType } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { agentWith, conversation, db, scripted, turnOf } from './agent-fixtures.ts';
import { ToolName } from './tools.ts';

// M-03, fake model and fake judge: nothing is billed.

afterAll(() => db.client.$disconnect());

const CLINICAL = 'minha lombar dói quando sento muito tempo, e a protusão na L5?';
const HANDOFF_TEXT = 'Vou verificar com o Dr. Rafael.';
const OLDER_MESSAGES = 24;
const SUMMARY_TEXT = 'Paciente pediu horário.';
const PREVIOUS_SUMMARY = 'Paciente perguntou o endereço.';
const unanswered = (pergunta: string) => ({ tool: ToolName.unanswered, input: { pergunta } });

async function stored(tenantId: string) {
  return db.withTenant(tenantId, (tx) => tx.knowledgeItem.findMany());
}

describe('registrar_duvida_sem_resposta (M-03)', () => {
  it('stores a harmless question and logs nothing', async () => {
    const scope = await conversation({ answered: true });
    const events: object[] = [];
    const fake = scripted([unanswered('tem estacionamento?'), { text: HANDOFF_TEXT }]);
    const agent = agentWith(fake.model, {
      judge: { health: 0.1 },
      log: (fields) => events.push(fields),
    });
    await agent(turnOf(scope, ['tem estacionamento?']));
    expect(await stored(scope.tenantId)).toMatchObject([{ question: 'tem estacionamento?' }]);
    expect(events).toHaveLength(0);
  });

  it.each([
    ['the judge flags health information', { health: 0.95 }],
    ['the judge is down', undefined],
  ])('stores nothing and logs no content when %s', async (_name, judge) => {
    const scope = await conversation({ answered: true });
    const events: object[] = [];
    const fake = scripted([unanswered(CLINICAL), { text: HANDOFF_TEXT }]);
    const agent = agentWith(fake.model, { judge, log: (fields) => events.push(fields) });
    await agent(turnOf(scope, ['tem estacionamento?']));
    expect(await stored(scope.tenantId)).toHaveLength(0);
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain('lombar');
  });

  it('rejects a question over the length cap', async () => {
    const scope = await conversation({ answered: true });
    const long = unanswered('a'.repeat(MAX_QUESTION_LENGTH + 1));
    const fake = scripted([long, { text: HANDOFF_TEXT }]);
    await agentWith(fake.model, { judge: { health: 0 } })(turnOf(scope, ['oi']));
    expect(await stored(scope.tenantId)).toHaveLength(0);
  });
});

describe('conversation summary (M-03)', () => {
  async function summaryAfter(judge: Record<string, number> | undefined, previous?: string) {
    const scope = await conversation({ answered: true });
    await db.withTenant(scope.tenantId, async (tx) => {
      if (previous) {
        await tx.conversation.update({
          where: { id: scope.conversationId },
          data: { summary: previous, summaryUntil: new Date(0) },
        });
      }
      const channel = await tx.channel.findFirstOrThrow();
      await tx.message.createMany({
        data: Array.from({ length: OLDER_MESSAGES }, (_unused, index) => ({
          tenantId: scope.tenantId,
          channelId: channel.id,
          conversationId: scope.conversationId,
          type: MessageType.text,
          direction: MessageDirection.inbound,
          author: MessageAuthor.patient,
          text: `mensagem ${String(index)}`,
          status: MessageStatus.received,
          createdAt: new Date(Date.UTC(2020, 0, 1, 0, index)),
        })),
      });
    });
    const fake = scripted([{ text: SUMMARY_TEXT }, { text: HANDOFF_TEXT }]);
    await agentWith(fake.model, { judge })(turnOf(scope, ['oi']));
    return db.withTenant(scope.tenantId, (tx) =>
      tx.conversation.findUniqueOrThrow({ where: { id: scope.conversationId } }),
    );
  }

  it('keeps a summary the judge accepts', async () => {
    expect(await summaryAfter({ health: 0 })).toMatchObject({ summary: SUMMARY_TEXT });
  });

  it.each([{ health: 0.95 }, undefined])('keeps no summary when flagged or down', async (judge) => {
    const result = await summaryAfter(judge);
    expect(result.summary).toBeNull();
    expect(result.summaryUntil).not.toBeNull();
  });

  it('keeps the previous, already checked summary when the new one is blocked', async () => {
    const result = await summaryAfter({ health: 0.95 }, PREVIOUS_SUMMARY);
    expect(result.summary).toBe(PREVIOUS_SUMMARY);
  });
});
