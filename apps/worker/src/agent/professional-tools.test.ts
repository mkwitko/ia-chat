import { randomUUID } from 'node:crypto';
import { createDb, Plan } from '@app/db';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AgendaToolName } from './agenda-tools.ts';
import { conversationTools, type ToolContext } from './tools.ts';

// Spec 05, "Agenda por profissional", through the assistant tools and no model: the client may
// name a professional; otherwise the options span everyone who performs the service, each with
// the professional's name, and the booking stores the professional the slot was offered with.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

// Fri 2027-01-01 09:00 in Sao Paulo. Ana works Mondays 09:00-11:00, Bruno 10:00-12:00.
const OFFER_TIME = new Date('2027-01-01T12:00:00Z');
const NEXT_TURN = new Date('2027-01-01T12:05:00Z');
const MONDAY_10 = '2027-01-04T10:00:00-03:00';
const MONDAY_11 = '2027-01-04T11:00:00-03:00';
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);
const TEAM = [
  ['Ana Exemplo', '09:00', '11:00'],
  ['Bruno Exemplo', '10:00', '12:00'],
] as const;

let base: Omit<ToolContext, 'now' | 'turnId' | 'effects'>;
let tenantId = '';
let ids: string[] = [];

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Clínica (fictícia)', slug: `pt-${randomUUID()}`, plan: Plan.clinica },
  });
  tenantId = tenant.id;
  base = await db.withTenant(tenantId, async (tx) => {
    ids = [];
    for (const [name, start, end] of TEAM) {
      const one = await tx.professional.create({ data: { tenantId, name } });
      await tx.availabilityRule.create({
        data: {
          tenantId,
          professionalId: one.id,
          weekday: 1,
          startTime: at(start),
          endTime: at(end),
        },
      });
      ids.push(one.id);
    }
    await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
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
interface Options extends Record<string, unknown> {
  opcoes: { inicio: string; profissional: string }[];
}

function run(now: Date, name: string, input: object) {
  const effects = { handoff: false };
  const tools = conversationTools({ ...base, now, turnId: randomUUID(), effects }, Plan.clinica);
  const execute = tools[name]?.execute as Execute | undefined;
  if (!execute) throw new Error(`no tool ${name}`);
  return execute(input, { toolCallId: 'call', messages: [], context: {} }) as Promise<
    Record<string, unknown>
  >;
}

const offer = (extra: object = {}) =>
  run(OFFER_TIME, AgendaToolName.availability, {
    servico: 'Sessão',
    a_partir_de: '2027-01-04',
    ...extra,
  }) as Promise<Options>;

const book = (inicio: string, extra: object = {}) =>
  run(NEXT_TURN, AgendaToolName.book, {
    servico: 'Sessão',
    inicio,
    nome_paciente: 'Paciente Fictício',
    confirmado: true,
    ...extra,
  });

const bookedWith = async () => {
  const rows = await db.withTenant(tenantId, (tx) =>
    tx.appointment.findMany({ select: { professionalId: true } }),
  );
  return rows.map((row) => row.professionalId);
};

describe('consultar_horarios across professionals', () => {
  it('offers every professional who performs the service, one option per time, named', async () => {
    const out = await offer();
    const monday = out.opcoes.filter((one) => one.inicio.startsWith('2027-01-04'));
    expect(monday.map((one) => [one.inicio.slice(11, 16), one.profissional])).toEqual([
      ['09:00', 'Ana Exemplo'],
      ['10:00', 'Ana Exemplo'],
      ['11:00', 'Bruno Exemplo'],
    ]);
  });

  it('narrows to the professional the client named, without accents or surname', async () => {
    const out = await offer({ profissional: 'bruno' });
    expect(new Set(out.opcoes.map((one) => one.profissional))).toEqual(new Set(['Bruno Exemplo']));
  });

  it('an unknown name returns the team instead of slots', async () => {
    const out = await offer({ profissional: 'Carla' });
    expect(out).toEqual({
      erro: 'profissional_nao_encontrado',
      profissionais: ['Ana Exemplo', 'Bruno Exemplo'],
    });
  });
});

describe('agendar per professional', () => {
  it('books with the professional the slot was offered with', async () => {
    await offer();
    const out = await book(MONDAY_11);
    expect(out).toMatchObject({ agendamento: { profissional: 'Bruno Exemplo' } });
    expect(await bookedWith()).toEqual([ids[1]]);
  });

  it('books the professional the client named', async () => {
    await offer({ profissional: 'Bruno' });
    await book(MONDAY_10, { profissional: 'Bruno' });
    expect(await bookedWith()).toEqual([ids[1]]);
  });

  it('refuses a professional the slot was not offered with', async () => {
    await offer();
    const out = await book(MONDAY_10, { profissional: 'Bruno' });
    expect(out).toEqual({ erro: 'horario_nao_oferecido' });
    expect(await bookedWith()).toEqual([]);
  });
});
