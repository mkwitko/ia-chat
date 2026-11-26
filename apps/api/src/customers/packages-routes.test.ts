import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTenant, signUpVerified, startTestApp, type TestContext } from '../test-support.ts';

// Research 09 #7: "Registrar pacote" and the manual adjustment on the client page; audited,
// isolated by tenant, and the package that is ending shows on Início.

let ctx: TestContext;
let owner: string;
let other: string;
let tenantId: string;
let contactId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
  other = await signUpVerified(ctx);
  await createTenant(ctx, other);
  contactId = await ctx.db.withTenant(tenantId, async (tx) => {
    await tx.tenant.update({
      where: { id: tenantId },
      data: {
        businessProfile: {
          packages: [
            { name: 'Pacote 4 sessões', priceCents: 80_000, sessions: 4 },
            { name: 'Avulso', priceCents: 20_000 },
          ],
        },
      },
    });
    const contact = await tx.contact.create({
      data: { tenantId, bsuid: `BR.${randomUUID()}`, name: 'Cliente Pacote' },
    });
    return contact.id;
  });
});
afterAll(() => ctx.app.close());

type Method = 'GET' | 'POST';
const call = (method: Method, url: string, extra: { payload?: object; cookie?: string } = {}) =>
  ctx.app.inject({
    method,
    url,
    headers: { cookie: extra.cookie ?? owner },
    ...(extra.payload ? { payload: extra.payload } : {}),
  });

interface Listing {
  packages: { id: string; name: string; sessions: number; used: number; remaining: number }[];
  options: { name: string }[];
}

describe('client packages', () => {
  it('records a package, adjusts it by one with a reason and audits both', async () => {
    const base = `/api/customers/${contactId}/packages`;
    const empty = (await call('GET', base)).json<Listing>();
    expect(empty.packages).toEqual([]);
    expect(empty.options.map((item) => item.name)).toEqual(['Pacote 4 sessões']);

    const purchase = {
      name: 'Pacote 4 sessões',
      sessions: 4,
      priceCents: 80_000,
      purchasedOn: '2026-11-20',
      paid: false,
    };
    const created = await call('POST', base, { payload: purchase });
    expect(created.statusCode).toBe(200);
    const { id } = created.json<{ id: string }>();

    const adjust = (delta: number) =>
      call('POST', `${base}/${id}/adjust`, { payload: { delta, reason: 'courtesy' } });
    expect((await adjust(-1)).statusCode).toBe(409);
    for (let i = 0; i < 3; i += 1) expect((await adjust(1)).statusCode).toBe(200);
    expect(
      (await call('POST', `${base}/${id}/adjust`, { payload: { delta: 1, reason: 'attended' } }))
        .statusCode,
    ).toBe(400);

    const listing = (await call('GET', base)).json<Listing>();
    expect(listing.packages[0]).toMatchObject({ used: 3, remaining: 1 });
    const audits = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.count({ where: { entity: 'client_package' } }),
    );
    expect(audits).toBe(4);

    const home = (await call('GET', '/api/home')).json<{
      attention: { endingPackages: { contactId: string; remaining: number }[] };
    }>();
    expect(home.attention.endingPackages).toEqual([
      expect.objectContaining({ contactId, remaining: 1 }),
    ]);
  });

  it('keeps another tenant out', async () => {
    const base = `/api/customers/${contactId}/packages`;
    expect((await call('GET', base, { cookie: other })).statusCode).toBe(404);
    const payload = {
      name: 'X',
      sessions: 1,
      priceCents: 0,
      purchasedOn: '2026-11-20',
      paid: true,
    };
    const sent = await call('POST', base, { payload, cookie: other });
    expect(sent.statusCode).toBe(404);
  });
});
