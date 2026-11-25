import { randomUUID } from 'node:crypto';
import { ActionKind, factsFromToolOutputs } from '@app/ai';
import { FakeCalendar, FakeFailure } from '@app/core';
import { createDb, Plan } from '@app/db';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AgendaToolName } from './agenda-tools.ts';
import { conversationTools, type ToolContext } from './tools.ts';

// E-20 with the database and no model: the confirmation rule is the code's, not the prompt's.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

// Fri 2027-01-01 09:00 in Sao Paulo; Mondays 09:00-12:00 are open (hourly slots).
const OFFER_TIME = new Date('2027-01-01T12:00:00Z');
const NEXT_TURN = new Date('2027-01-01T12:05:00Z');
const MONDAY_9 = '2027-01-04T09:00:00-03:00';
const MONDAY_10 = '2027-01-04T10:00:00-03:00';
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

let base: Omit<ToolContext, 'now' | 'turnId' | 'effects'>;
let tenantId = '';

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Agenda (fictício)', slug: `ag-${randomUUID()}`, plan: Plan.agenda },
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
    };
  });
});

type Execute = (input: object, options: object) => Promise<unknown>;

function turn(now: Date, turnId: string = randomUUID(), contactId = base.contactId) {
  const effects = { handoff: false };
  const tools = conversationTools({ ...base, contactId, now, turnId, effects }, Plan.agenda);
  const run = async (name: string, input: object): Promise<Record<string, unknown>> => {
    const execute = tools[name]?.execute as Execute | undefined;
    if (!execute) throw new Error(`no tool ${name}`);
    return (await execute(input, { toolCallId: 'call', messages: [], context: {} })) as Record<
      string,
      unknown
    >;
  };
  return { run, effects };
}

const offer = () =>
  turn(OFFER_TIME).run(AgendaToolName.availability, {
    servico: 'sessao',
    a_partir_de: '2027-01-01',
  });
const bookInput = (inicio: string, confirmado = true) => ({
  servico: 'Sessão',
  inicio,
  nome_paciente: 'Paciente Fictício',
  confirmado,
});
const appointmentCount = () => db.withTenant(tenantId, (tx) => tx.appointment.count());

describe('plan gating', () => {
  it('Essencial gets no agenda tool; Agenda gets all five', () => {
    const context = { ...base, now: OFFER_TIME, turnId: 't', effects: { handoff: false } };
    const essential = Object.keys(conversationTools(context, Plan.essencial));
    const agenda = Object.keys(conversationTools(context, Plan.agenda));
    for (const name of Object.values(AgendaToolName)) {
      expect(essential).not.toContain(name);
      expect(agenda).toContain(name);
    }
  });
});

describe('consultar_horarios', () => {
  it('returns at most 6 options with the local wall clock as facts', async () => {
    const out = (await offer()) as { opcoes: { inicio: string }[] };
    expect(out.opcoes.map((one) => one.inicio)).toEqual([
      '2027-01-04T09:00:00-03:00',
      '2027-01-04T10:00:00-03:00',
      '2027-01-04T11:00:00-03:00',
      '2027-01-11T09:00:00-03:00',
      '2027-01-11T10:00:00-03:00',
      '2027-01-11T11:00:00-03:00',
    ]);
    expect(
      factsFromToolOutputs([{ tool: AgendaToolName.availability, output: out }]).times,
    ).toContain('09:00');
  });
});

describe('confirmation rule (enforced by code)', () => {
  it('refuses to book without the patient confirmation', async () => {
    await offer();
    const out = await turn(NEXT_TURN).run(AgendaToolName.book, bookInput(MONDAY_9, false));
    expect(out).toEqual({ erro: 'confirmacao_pendente' });
    expect(await appointmentCount()).toBe(0);
  });

  it('refuses a slot that was never offered', async () => {
    const out = await turn(NEXT_TURN).run(AgendaToolName.book, bookInput(MONDAY_9));
    expect(out).toEqual({ erro: 'horario_nao_oferecido' });
    expect(await appointmentCount()).toBe(0);
  });

  it('refuses a slot offered in the same turn: the patient has not answered yet', async () => {
    const sameTurn = turn(OFFER_TIME);
    await sameTurn.run(AgendaToolName.availability, {
      servico: 'Sessão',
      a_partir_de: '2027-01-01',
    });
    const out = await sameTurn.run(AgendaToolName.book, bookInput(MONDAY_9));
    expect(out).toEqual({ erro: 'horario_nao_oferecido' });
  });

  it('books a slot offered earlier and confirmed, and proves it in the facts', async () => {
    await offer();
    const out = await turn(NEXT_TURN).run(AgendaToolName.book, bookInput(MONDAY_9));
    const facts = factsFromToolOutputs([{ tool: AgendaToolName.book, output: out }]);
    expect(facts.actions).toEqual([ActionKind.booked]);
    expect(facts.times).toContain('09:00');
    expect(await appointmentCount()).toBe(1);
  });

  it('is idempotent within a turn: the same call twice books once', async () => {
    await offer();
    const retried = turn(NEXT_TURN, 'turn-fixed');
    const first = await retried.run(AgendaToolName.book, bookInput(MONDAY_9));
    const second = await retried.run(AgendaToolName.book, bookInput(MONDAY_9));
    expect(second).toEqual(first);
    expect(await appointmentCount()).toBe(1);
  });
});

describe('failures never become claims (A-11)', () => {
  it('a slot taken meanwhile returns an error and no booked fact', async () => {
    await offer();
    await turn(NEXT_TURN).run(AgendaToolName.book, bookInput(MONDAY_9));
    const other = await db.withTenant(tenantId, (tx) =>
      tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } }),
    );
    const out = await turn(NEXT_TURN, randomUUID(), other.id).run(
      AgendaToolName.book,
      bookInput(MONDAY_9),
    );
    expect(out).toEqual({ erro: 'slot_taken' });
    expect(factsFromToolOutputs([{ tool: AgendaToolName.book, output: out }]).actions).toEqual([]);
  });
});

describe('reschedule and cancel', () => {
  async function booked() {
    await offer();
    await turn(OFFER_TIME).run(AgendaToolName.availability, {
      servico: 'Sessão',
      a_partir_de: '2027-01-01',
    });
    const out = (await turn(NEXT_TURN).run(AgendaToolName.book, bookInput(MONDAY_9))) as {
      agendamento: { id: string };
    };
    return out.agendamento.id;
  }

  it('moves to an offered slot only after confirmation', async () => {
    const id = await booked();
    const later = new Date('2027-01-01T12:10:00Z');
    const unconfirmed = await turn(later).run(AgendaToolName.reschedule, {
      agendamento: id,
      novo_inicio: MONDAY_10,
      confirmado: false,
    });
    expect(unconfirmed).toEqual({ erro: 'confirmacao_pendente' });
    const moved = await turn(later).run(AgendaToolName.reschedule, {
      agendamento: id,
      novo_inicio: MONDAY_10,
      confirmado: true,
    });
    expect(
      factsFromToolOutputs([{ tool: AgendaToolName.reschedule, output: moved }]).actions,
    ).toEqual([ActionKind.rescheduled]);
  });

  it('a cancellation inside the notice window hands the patient to the professional (RF-44)', async () => {
    const id = await booked();
    const lastMinute = turn(new Date('2027-01-04T00:00:00Z'));
    const out = await lastMinute.run(AgendaToolName.cancel, { agendamento: id, confirmado: true });
    expect(out).toEqual({ erro: 'cancelamento_fora_do_prazo' });
    expect(lastMinute.effects.handoff).toBe(true);
  });

  it('cancels with confirmation and lists nothing afterwards', async () => {
    const id = await booked();
    const early = turn(NEXT_TURN);
    expect(await early.run(AgendaToolName.cancel, { agendamento: id, confirmado: false })).toEqual({
      erro: 'confirmacao_pendente',
    });
    const done = await early.run(AgendaToolName.cancel, { agendamento: id, confirmado: true });
    expect(factsFromToolOutputs([{ tool: AgendaToolName.cancel, output: done }]).actions).toEqual([
      ActionKind.cancelled,
    ]);
    expect(await turn(NEXT_TURN).run(AgendaToolName.list, {})).toEqual({ agendamentos: [] });
  });
});

describe('Google Calendar as the source of availability (E-21)', () => {
  const HOUR_MS = 3_600_000;
  const run = async (google: FakeCalendar) => {
    const effects = { handoff: false };
    const calendar = () =>
      Promise.resolve({ provider: google, calendarId: 'c', onFailure: () => Promise.resolve() });
    const tools = conversationTools(
      { ...base, now: OFFER_TIME, turnId: 't', effects, calendar },
      Plan.agenda,
    );
    const execute = tools[AgendaToolName.availability]?.execute as Execute;
    const input = { servico: 'sessao', a_partir_de: '2027-01-01' };
    const out = await execute(input, { toolCallId: 'call', messages: [], context: {} });
    return { out: out as { opcoes?: { inicio: string }[]; erro?: string }, effects };
  };

  it('does not offer a time that is busy on Google', async () => {
    const google = new FakeCalendar();
    google.externalBusy = [
      { start: new Date(MONDAY_9), end: new Date(Date.parse(MONDAY_9) + HOUR_MS) },
    ];
    const { out } = await run(google);
    expect(out.opcoes?.map((one) => one.inicio)).not.toContain(MONDAY_9);
    expect(out.opcoes?.map((one) => one.inicio)).toContain(MONDAY_10);
  });

  it('offers nothing and hands the patient to the professional when Google is unreachable', async () => {
    const google = new FakeCalendar();
    google.failWith = FakeFailure.auth;
    const { out, effects } = await run(google);
    expect(out).toEqual({ erro: 'agenda_externa_indisponivel' });
    expect(effects.handoff).toBe(true);
  });
});
