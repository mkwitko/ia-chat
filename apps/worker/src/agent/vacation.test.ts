import { randomUUID } from 'node:crypto';
import { createDb, Plan, TimeOffKind } from '@app/db';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AgendaToolName } from './agenda-tools.ts';
import { conversationTools, type ToolContext } from './tools.ts';

// E-22b (RF-14), database and no model: a vacation removes its slots and the tool hands the
// assistant the return date, so the model never invents one.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

// Fri 2027-01-01 09:00 in Sao Paulo; Mondays 09:00-12:00 are open (hourly slots).
const NOW = new Date('2027-01-01T12:00:00Z');
const VACATION_START = new Date('2027-01-04T03:00:00Z'); // Mon 00:00 local
const VACATION_END = new Date('2027-01-11T03:00:00Z'); // next Mon 00:00 local: first day back
const FIRST_DAY_BACK = '2027-01-11';
const RETURN_DATE = '11/01/2027';
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

let base: Omit<ToolContext, 'now' | 'turnId' | 'effects'>;
let tenantId = '';

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Férias (fictício)', slug: `fe-${randomUUID()}`, plan: Plan.agenda },
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

async function takeVacation() {
  await db.withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.findFirstOrThrow();
    await tx.timeOff.create({
      data: {
        tenantId,
        professionalId: professional.id,
        startsAt: VACATION_START,
        endsAt: VACATION_END,
        kind: TimeOffKind.vacation,
      },
    });
  });
}

type Execute = (input: object, options: object) => Promise<unknown>;

async function offer(from: string): Promise<{ opcoes: { inicio: string }[]; ferias?: unknown }> {
  const tools = conversationTools(
    { ...base, now: NOW, turnId: randomUUID(), effects: { handoff: false } },
    Plan.agenda,
  );
  const execute = tools[AgendaToolName.availability]?.execute as Execute;
  return (await execute(
    { servico: 'sessao', a_partir_de: from },
    { toolCallId: 'call', messages: [], context: {} },
  )) as { opcoes: { inicio: string }[]; ferias?: unknown };
}

describe('vacation mode (RF-14)', () => {
  it('offers nothing inside the period and says when the professional is back', async () => {
    await takeVacation();
    const result = await offer('2027-01-04');
    const days = result.opcoes.map((slot) => slot.inicio.slice(0, 10));
    expect(days.every((day) => day >= FIRST_DAY_BACK)).toBe(true);
    expect(days.length).toBeGreaterThan(0);
    expect(result.ferias).toMatchObject({ retorno: RETURN_DATE });
  });

  it('says it too when the period starts later and nothing is free before it', async () => {
    await takeVacation();
    const result = await offer('2027-01-02');
    expect(result.opcoes.every((slot) => !slot.inicio.startsWith('2027-01-04'))).toBe(true);
    expect(result.ferias).toMatchObject({ retorno: RETURN_DATE });
  });

  it('without a vacation there is no notice', async () => {
    const result = await offer('2027-01-02');
    expect(result.opcoes.length).toBeGreaterThan(0);
    expect(result).not.toHaveProperty('ferias');
  });
});
