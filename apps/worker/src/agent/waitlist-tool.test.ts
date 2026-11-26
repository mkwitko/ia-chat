import { randomUUID } from 'node:crypto';
import { createDb, Plan, WaitlistStatus } from '@app/db';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { AgendaToolName } from './agenda-tools.ts';
import { conversationTools, type ToolContext } from './tools.ts';
import { WaitlistError } from './waitlist-tool.ts';

// M-09: entrar_lista_de_espera writes the request only after the client confirmed it.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 2 });
afterAll(() => db.client.$disconnect());

const NOW = new Date('2027-01-01T12:00:00Z');
let context: ToolContext;

beforeEach(async () => {
  const tenant = await db.client.tenant.create({
    data: { name: 'Espera (fictício)', slug: `wt-${randomUUID()}`, plan: Plan.agenda },
  });
  const tenantId = tenant.id;
  context = await db.withTenant(tenantId, async (tx) => {
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
      now: NOW,
      turnId: randomUUID(),
      effects: { handoff: false },
    };
  });
});

type Execute = (input: object, options: object) => Promise<unknown>;

function join(input: object) {
  const tools = conversationTools(context, Plan.agenda);
  const execute = tools[AgendaToolName.waitlist]?.execute as Execute;
  return execute(input, { toolCallId: 'call', messages: [], context: {} });
}
const entries = () => db.withTenant(context.tenantId, (tx) => tx.slotWaitlistEntry.findMany());

describe('entrar_lista_de_espera', () => {
  const request = { servico: 'sessao', de: '2027-01-04', ate: '2027-01-08' };

  it('needs the client to confirm before writing anything', async () => {
    expect(await join({ ...request, confirmado: false })).toEqual({
      erro: 'confirmacao_pendente',
    });
    expect(await entries()).toEqual([]);
  });

  it('writes one waiting request covering the whole local days', async () => {
    const out = await join({ ...request, confirmado: true });
    expect(out).toMatchObject({ lista_de_espera: { servico: 'Sessão' } });
    const [entry] = await entries();
    expect(entry?.status).toBe(WaitlistStatus.waiting);
    expect(entry?.windowStart).toEqual(new Date('2027-01-04T03:00:00Z'));
    expect(entry?.windowEnd).toEqual(new Date('2027-01-09T03:00:00Z'));
  });

  it('refuses an inverted or too long period', async () => {
    const inverted = await join({
      ...request,
      de: '2027-01-08',
      ate: '2027-01-04',
      confirmado: true,
    });
    expect(inverted).toEqual({ erro: WaitlistError.invalidRange });
    const long = await join({ ...request, ate: '2027-06-01', confirmado: true });
    expect(long).toEqual({ erro: WaitlistError.invalidRange });
  });
});
