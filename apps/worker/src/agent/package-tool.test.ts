import { randomUUID } from 'node:crypto';
import { createDb, Plan, registerPackage } from '@app/db';
import { afterAll, describe, expect, it } from 'vitest';
import { conversationTools, ToolName } from './tools.ts';

// Research 09 #7: the balance comes from the ledger of the contact in this conversation only.

const db = createDb(process.env.DATABASE_URL ?? '', { max: 4 });
afterAll(() => db.client.$disconnect());

type Execute = (input: object, options: object) => Promise<unknown>;

async function world() {
  const tenant = await db.client.tenant.create({
    data: { name: 'Saldo (fictício)', slug: `sd-${randomUUID()}` },
  });
  const tenantId = tenant.id;
  return db.withTenant(tenantId, async (tx) => {
    const buyer = await tx.contact.create({ data: { tenantId, bsuid: `BR.${randomUUID()}` } });
    const someoneElse = await tx.contact.create({
      data: { tenantId, bsuid: `BR.${randomUUID()}` },
    });
    const pkg = await registerPackage(tx, {
      tenantId,
      contactId: buyer.id,
      name: 'Pacote 4 sessões',
      sessions: 4,
      priceCents: 80_000,
      purchasedOn: '2027-01-02',
      paid: true,
    });
    await tx.packageEntry.create({
      data: { tenantId, packageId: pkg.id, delta: 1, reason: 'courtesy' },
    });
    return { tenantId, buyer: buyer.id, someoneElse: someoneElse.id };
  });
}

async function ask(tenantId: string, contactId: string) {
  const tools = conversationTools(
    {
      db,
      tenantId,
      contactId,
      conversationId: randomUUID(),
      turnId: randomUUID(),
      now: new Date(),
      timezone: 'America/Sao_Paulo',
      effects: { handoff: false },
      health: () => Promise.resolve(false),
    },
    Plan.essencial,
  );
  const execute = tools[ToolName.packages]?.execute as Execute | undefined;
  if (!execute) throw new Error('no package tool');
  return execute({}, { toolCallId: 'call', messages: [], context: {} });
}

describe('consultar_saldo_de_pacotes', () => {
  it("answers with this contact's package name and counts only", async () => {
    const { tenantId, buyer, someoneElse } = await world();
    expect(await ask(tenantId, buyer)).toEqual({
      pacotes: [{ nome: 'Pacote 4 sessões', sessoes: 4, usadas: 1, restantes: 3 }],
    });
    expect(await ask(tenantId, someoneElse)).toEqual({ pacotes: [] });
  });
});
