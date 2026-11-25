import { afterAll, describe, expect, it } from 'vitest';
import { agentWith, conversation, db, scripted, turnOf } from './agent-fixtures.ts';
import { AgentCopy } from '@app/agent';

afterAll(() => db.client.$disconnect());

describe('output validation in the turn (E-14)', () => {
  it('retries once with the correction when the price is not in the catalog (A-07)', async () => {
    const scope = await conversation({ answered: true });
    const fake = scripted([
      { text: 'A avaliação custa R$ 150,00.' },
      { text: 'A avaliação custa R$ 180,00.' },
    ]);
    const reply = await agentWith(fake.model)(turnOf(scope, ['quanto custa?']));
    expect(reply).toMatchObject({ text: 'A avaliação custa R$ 180,00.', handoff: false });
    expect(JSON.stringify(fake.prompts[1])).toContain('citou um valor que não está no perfil');
  });

  it('hands off when the second answer also fails', async () => {
    const scope = await conversation({ answered: true });
    const fake = scripted([{ text: 'Está agendado!' }, { text: 'Ficou agendado, pode vir.' }]);
    const reply = await agentWith(fake.model)(turnOf(scope, ['agenda pra mim']));
    expect(reply).toMatchObject({ handoff: true, model: 'none' });
  });

  it('retries when Jev sees clinical advice the word list missed', async () => {
    const scope = await conversation({ answered: true });
    const fake = scripted([
      { text: 'Evite pegar peso esses dias.' },
      { text: 'O Dr. Rafael avalia isso na consulta.' },
    ]);
    const reply = await agentWith(fake.model, { judge: { clinical: 0.92 } })(
      turnOf(scope, ['minhas costas doem']),
    );
    expect(fake.prompts).toHaveLength(2);
    expect(reply).toMatchObject({ handoff: true }); // Jev still says clinical on the retry in this fake
  });

  it('treats a message Jev judges urgent as an emergency, without the model', async () => {
    const scope = await conversation({ answered: true });
    const fake = scripted([]);
    const reply = await agentWith(fake.model, { judge: { urgent: 0.8 } })(
      turnOf(scope, ['estou passando muito mal, acho que vou apagar']),
    );
    expect(reply).toMatchObject({
      text: AgentCopy.emergency,
      handoff: true,
    });
    expect(fake.prompts).toHaveLength(0);
  });

  it('goes on with the rules alone when Jev is down (fail-safe)', async () => {
    const scope = await conversation({ answered: true });
    const reply = await agentWith(
      scripted([{ text: 'O Dr. Rafael avalia isso na consulta.' }]).model,
    )(turnOf(scope, ['minhas costas doem']));
    expect(reply).toMatchObject({ text: 'O Dr. Rafael avalia isso na consulta.', handoff: false });
  });
});

describe('times from the profile (E-14)', () => {
  it('accepts a time the knowledge base states, with no agenda tool', async () => {
    const scope = await conversation({ answered: true });
    await db.withTenant(scope.tenantId, (tx) =>
      tx.knowledgeItem.create({
        data: {
          tenantId: scope.tenantId,
          question: 'Horário de atendimento',
          answer: 'Segunda a sexta, das 8h às 18h.',
        },
      }),
    );
    const fake = scripted([{ text: 'Atendemos de segunda a sexta, das 8h às 18h.' }]);
    const reply = await agentWith(fake.model)(turnOf(scope, ['até que horas vocês atendem?']));
    expect(reply).toMatchObject({
      text: 'Atendemos de segunda a sexta, das 8h às 18h.',
      handoff: false,
    });
    expect(fake.prompts).toHaveLength(1);
  });
});
