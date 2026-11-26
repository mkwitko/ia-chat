import { randomUUID } from 'node:crypto';
import { ActionKind, factsFromToolOutputs } from '@app/ai';
import { crc16 } from '@app/core';
import { createDb, FeatureKey, Plan } from '@app/db';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AgendaToolName } from './agenda-tools.ts';
import { conversationTools, type ToolContext, type ToolEffects } from './tools.ts';

// H-52 with the database and no model: the booking holds the slot and the Pix code is the
// code's, never the model's. Fictitious data.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

const OFFER_TIME = new Date('2027-01-01T12:00:00Z');
const NEXT_TURN = new Date('2027-01-01T12:05:00Z');
const MONDAY_9 = '2027-01-04T09:00:00-03:00';
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

let base: Omit<ToolContext, 'now' | 'turnId' | 'effects'>;
let tenantId = '';

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Sinal (fictício)', slug: `dep-${randomUUID()}`, plan: Plan.agenda },
  });
  tenantId = tenant.id;
  base = await db.withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    await tx.availabilityRule.create({
      data: {
        tenantId,
        professionalId: professional.id,
        weekday: 1,
        startTime: at('09:00'),
        endTime: at('12:00'),
      },
    });
    await tx.service.create({
      data: {
        tenantId,
        name: 'Sessão',
        durationMinutes: 60,
        priceCents: 18_000,
        depositCents: 5_000,
      },
    });
    await tx.depositSettings.create({
      data: {
        tenantId,
        pixKey: 'pix@exemplo.com',
        receiverName: 'Clinica Exemplo',
        city: 'Sao Paulo',
      },
    });
    const channel = await tx.channel.create({ data: { tenantId, kind: 'cloud_api' } });
    const contact = await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } });
    const conversation = await tx.conversation.create({
      data: { tenantId, channelId: channel.id, contactId: contact.id },
    });
    return {
      db,
      tenantId,
      contactId: contact.id,
      conversationId: conversation.id,
      timezone: 'America/Sao_Paulo',
      health: () => Promise.resolve(false),
    };
  });
});

type Execute = (input: object, options: object) => Promise<unknown>;

function turn(now: Date) {
  const effects: ToolEffects = { handoff: false };
  const tools = conversationTools({ ...base, now, turnId: randomUUID(), effects }, Plan.agenda);
  const run = async (name: string, input: object) => {
    const execute = tools[name]?.execute as Execute | undefined;
    if (!execute) throw new Error(`no tool ${name}`);
    return (await execute(input, { toolCallId: 'call', messages: [], context: {} })) as Record<
      string,
      unknown
    >;
  };
  return { run, effects };
}

async function book() {
  await turn(OFFER_TIME).run(AgendaToolName.availability, {
    servico: 'sessao',
    a_partir_de: '2027-01-01',
  });
  const second = turn(NEXT_TURN);
  const output = await second.run(AgendaToolName.book, {
    servico: 'sessao',
    inicio: MONDAY_9,
    nome_paciente: 'Maria',
    confirmado: true,
  });
  return { output, effects: second.effects };
}

describe('booking with a Pix deposit (H-52)', () => {
  it('holds the slot, returns the deadline and leaves a valid Pix code for the turn', async () => {
    const { output, effects } = await book();
    expect(output.sinal).toMatchObject({
      situacao_sinal: 'aguardando',
      valor_centavos: 5_000,
      expira_em: '2027-01-01T09:35:00-03:00',
    });
    const code = effects.pixCode ?? '';
    expect(code).toContain('0115pix@exemplo.com');
    expect(code).toContain('540550.00');
    expect(crc16(code.slice(0, -4))).toBe(code.slice(-4));
    const messages = await db.withTenant(tenantId, (tx) => tx.scheduledMessage.count());
    expect(messages).toBe(0);
  });

  it('the list says "aguardando", which never allows a payment claim', async () => {
    await book();
    const listed = await turn(NEXT_TURN).run(AgendaToolName.list, {});
    expect(JSON.stringify(listed)).toContain('"situacao_sinal":"aguardando"');
    const facts = factsFromToolOutputs([{ tool: AgendaToolName.list, output: listed }]);
    expect(facts.actions).not.toContain(ActionKind.paid);
  });

  it('books without a deposit when the owner turned the feature off', async () => {
    await db.withTenant(tenantId, (tx) =>
      tx.featureSetting.create({
        data: { tenantId, feature: FeatureKey.pix_deposit, enabled: false },
      }),
    );
    const { output, effects } = await book();
    expect(output.sinal).toBeUndefined();
    expect(effects.pixCode).toBeUndefined();
  });
});
