import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { createDb, type Db } from './index.ts';

const url = process.env.DATABASE_URL ?? '';
if (!url) throw new Error('DATABASE_URL is required for integration tests');

// One connection, so every query reuses it, like a busy pool or PgBouncer.
const opened: Db[] = [];
function singleConnectionDb(): Db {
  const db = createDb(url, { max: 1 });
  opened.push(db);
  return db;
}
afterEach(async () => {
  await Promise.all(opened.splice(0).map((db) => db.client.$disconnect()));
});

async function currentSetting(db: Db): Promise<string | null> {
  const rows = await db.client.$queryRaw<{ v: string | null }[]>`
    select current_setting('app.tenant_id', true) as v`;
  return rows[0]?.v ?? null;
}

describe('tenant context on a pooled connection', () => {
  it('session SET leaks into the next transaction on the same connection', async () => {
    const db = singleConnectionDb();
    const tenantA = randomUUID();
    await db.client.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`set app.tenant_id = '${tenantA}'`);
    });
    expect(await currentSetting(db)).toBe(tenantA);
  });

  it('withTenant uses set_config(..., true), which ends with the transaction', async () => {
    const db = singleConnectionDb();
    const tenantA = randomUUID();
    const inside = await db.withTenant(tenantA, async (tx) => {
      const rows = await tx.$queryRaw<{ v: string }[]>`select app_current_tenant()::text as v`;
      return rows[0]?.v;
    });
    expect(inside).toBe(tenantA);
    expect(await currentSetting(db)).toBeFalsy();
  });

  it('concurrent withTenant calls each see only their own tenant', async () => {
    const db = createDb(url, { max: 4 });
    opened.push(db);
    const ids = Array.from({ length: 20 }, () => randomUUID());
    const seen = await Promise.all(
      ids.map((id) =>
        db.withTenant(id, async (tx) => {
          const rows = await tx.$queryRaw<{ v: string }[]>`select app_current_tenant()::text as v`;
          return rows[0]?.v;
        }),
      ),
    );
    expect(seen).toEqual(ids);
  });
});

describe('business query outside withTenant', () => {
  it('fails instead of running without a tenant', async () => {
    const db = singleConnectionDb();
    await expect(db.client.$queryRaw`select app_current_tenant()`).rejects.toThrow(
      /tenant context missing/,
    );
  });

  it('fails after a withTenant transaction on the same connection', async () => {
    const db = singleConnectionDb();
    await db.withTenant(randomUUID(), () => Promise.resolve(undefined));
    await expect(db.client.$queryRaw`select app_current_tenant()`).rejects.toThrow(
      /tenant context missing/,
    );
  });

  it('rejects a tenant id that is not a UUID', async () => {
    const db = singleConnectionDb();
    await expect(
      db.withTenant("x'; drop table y; --", () => Promise.resolve(undefined)),
    ).rejects.toThrow(/UUID/);
  });
});

describe('database roles (RN-02)', () => {
  it('app connects without BYPASSRLS and owns no table', async () => {
    const db = singleConnectionDb();
    const rows = await db.client.$queryRaw<{ bypass: boolean; super: boolean; owned: bigint }[]>`
      select r.rolbypassrls as bypass, r.rolsuper as super,
        (select count(*) from pg_tables where tableowner = current_user) as owned
      from pg_roles r where r.rolname = current_user`;
    expect(rows[0]).toEqual({ bypass: false, super: false, owned: 0n });
  });
});
