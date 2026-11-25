import { Identity } from '@app/ai';
import { Autonomy, IdentityMode, KnowledgeSource, MessageType } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { agentWith, conversation, db, scripted, subscribePush, turnOf } from './agent-fixtures.ts';
import { AgentCopy } from '@app/agent';
import { ToolName } from './tools.ts';

const AWAY_PERSONA = {
  identity: Identity.assistant,
  assistantName: 'Lia',
  professionalName: 'Dr. Rafael Exemplo',
};

afterAll(() => db.client.$disconnect());

describe('conversation agent (E-13)', () => {
  it('answers urgency with the fixed emergency message and hands off, with no model call', async () => {
    const scope = await conversation({ autonomy: Autonomy.approve });
    const fake = scripted([]);
    const reply = await agentWith(fake.model)(turnOf(scope, ['to com dor no peito agora']));
    expect(reply).toMatchObject({
      text: `${AgentCopy.emergency(false)} Aqui é Lia, assistente virtual do consultório de Dr. Rafael Exemplo.`,
      handoff: true,
      mode: 'send',
      model: 'none',
    });
    expect(fake.prompts).toHaveLength(0);
  });

  it('says the professional was warned only when a push really reaches them', async () => {
    const scope = await conversation({ autonomy: Autonomy.approve });
    const urgent = turnOf(scope, ['to com dor no peito agora']);
    const noKeys = await agentWith(scripted([]).model, { pushEnabled: false })(urgent);
    expect(noKeys?.text).not.toContain('avisei');
    const noDevice = await agentWith(scripted([]).model, { pushEnabled: true })(urgent);
    expect(noDevice?.text).not.toContain('avisei');
    await subscribePush(scope.tenantId);
    const warned = await agentWith(scripted([]).model, { pushEnabled: true })(urgent);
    expect(warned?.text).toContain('Já avisei o profissional');
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
    const log = await db.withTenant(scope.tenantId, (tx) =>
      tx.consentEvent.findMany({ where: { contactId: scope.contactId } }),
    );
    expect(log).toMatchObject([{ kind: 'opt_out', category: 'all', source: 'patient_message' }]);
    expect(await agentWith(fake.model)(turnOf(scope, [null], MessageType.sticker))).toBeNull();
    expect(fake.prompts).toHaveLength(0);
  });

  it('lets the client come back with "voltar", and only the client', async () => {
    const scope = await conversation();
    const fake = scripted([{ text: 'Claro, qual dia?' }]);
    await agentWith(fake.model)(turnOf(scope, ['SAIR']));
    expect((await agentWith(fake.model)(turnOf(scope, ['voltar'])))?.text).toContain(
      AgentCopy.optInConfirmation,
    );
    const contact = await db.withTenant(scope.tenantId, (tx) =>
      tx.contact.findUniqueOrThrow({ where: { id: scope.contactId } }),
    );
    expect(contact.optOutAt).toBeNull();
    const log = await db.withTenant(scope.tenantId, (tx) =>
      tx.consentEvent.findMany({ where: { contactId: scope.contactId, kind: 'opt_in' } }),
    );
    expect(log).toMatchObject([
      { category: 'all', source: 'patient_message', actorType: 'contact' },
    ]);
    // Not opted out: the word is an ordinary message for the model.
    expect((await agentWith(fake.model)(turnOf(scope, ['voltar'])))?.text).toContain('qual dia');
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

  it('introduces itself according to the identity mode', () => {
    const persona = { assistantName: 'Assistente virtual', professionalName: 'Dra. Ana Exemplo' };
    expect(AgentCopy.identification({ ...persona, identity: Identity.assistant })).toBe(
      'Oi! Sou a assistente virtual do consultório de Dra. Ana Exemplo.',
    );
    expect(AgentCopy.identification({ ...persona, identity: Identity.clinic })).toBe(
      'Oi! Aqui é do consultório de Dra. Ana Exemplo.',
    );
    expect(AgentCopy.identification({ ...persona, identity: Identity.professional })).toBeNull();
    // Only a professional who really gets the push (E-16) is said to be warned.
    expect(AgentCopy.emergency(true)).toContain('Já avisei o profissional');
    expect(AgentCopy.emergency(false)).not.toContain('avisei');
    expect(AgentCopy.emergency(false)).toContain('192');
  });

  it('speaks as the professional without any introduction in that mode', async () => {
    const scope = await conversation({ identityMode: IdentityMode.professional });
    const reply = await agentWith(scripted([{ text: 'Oi! A avaliação custa R$ 180,00.' }]).model)(
      turnOf(scope, ['oi']),
    );
    expect(reply?.text).toBe('Oi! A avaliação custa R$ 180,00.');
  });

  it('keeps the answer as a draft when the tenant approves before sending (RF-13)', async () => {
    const scope = await conversation({ autonomy: Autonomy.approve, answered: true });
    const reply = await agentWith(
      scripted([{ text: 'Vou ver os horários livres para você.' }]).model,
    )(turnOf(scope, ['tem horário?']));
    expect(reply).toMatchObject({
      text: 'Vou ver os horários livres para você.',
      mode: 'draft',
      handoff: false,
    });
  });

  it('marks the handoff and records the unanswered question through the tools', async () => {
    const scope = await conversation({ answered: true });
    const fake = scripted([
      { tool: ToolName.unanswered, input: { pergunta: 'tem wi-fi na sala de espera?' } },
      { tool: ToolName.handoff, input: { motivo: 'paciente quer falar com o profissional' } },
      { text: 'Vou passar para o Dr. Rafael.' },
    ]);
    const reply = await agentWith(fake.model, { judge: { health: 0 } })(
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
      caps: { turn: 0n, conversation: 1_000_000n, tenantMonth: 1_000_000n },
    })(turnOf(scope, ['oi']));
    expect(reply).toMatchObject({ handoff: true, model: 'none' });
  });

  it('with autonomy off makes no model and no judge call and sends the fixed away message (E-18b)', async () => {
    const scope = await conversation({ autonomy: Autonomy.off });
    const fake = scripted([]);
    // Jev would call this urgent; off means it is never asked.
    const reply = await agentWith(fake.model, { judge: { urgent: 0.99 } })(
      turnOf(scope, ['quero marcar uma consulta']),
    );
    expect(reply).toMatchObject({ mode: 'send', model: 'none', handoff: false, costMicroUsd: 0n });
    expect(reply?.text).toContain(AgentCopy.away(AWAY_PERSONA));
    expect(reply).not.toHaveProperty('urgent');
    expect(fake.prompts).toHaveLength(0);
  });

  it('with autonomy off the deterministic urgency word list still answers SAMU', async () => {
    const scope = await conversation({ autonomy: Autonomy.off });
    const fake = scripted([]);
    const reply = await agentWith(fake.model)(turnOf(scope, ['to com dor no peito agora']));
    expect(reply).toMatchObject({ handoff: true, urgent: true, model: 'none' });
    expect(fake.prompts).toHaveLength(0);
  });
});
