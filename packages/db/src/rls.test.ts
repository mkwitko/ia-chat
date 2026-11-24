import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from './index.ts';
import { seedTenant } from './seed.ts';

// RN-06 / A-18: generated from the database catalog, so a new table without
// tenant_id, RLS or a fixture row fails here.

const url = process.env.DATABASE_URL ?? '';
if (!url) throw new Error('DATABASE_URL is required for integration tests');

/** Tables without tenant_id, by design. Adding one here needs a reason. */
const PLATFORM_TABLES = new Set([
  '_prisma_migrations', // migration bookkeeping, no app access
  'tenants', // the tenant itself; managed by auth (E-04)
  'specialty_policies', // global catalog, read-only for the app
  'channel_routes', // webhook routing by provider account, read before the tenant is known (E-09)
  // Better Auth (E-04): read before a tenant is chosen. The API guard checks membership.
  'users',
  'sessions',
  'accounts',
  'verifications',
  'memberships',
  'invitations',
]);

const PERMISSION_DENIED = 'permission denied';

const db = createDb(url);

interface TableInfo {
  name: string;
  hasTenantId: boolean;
  rls: boolean;
  forced: boolean;
  policies: number;
  tenantIndex: boolean;
}

let tables: TableInfo[] = [];
let tenantA = '';
let tenantB = '';

beforeAll(async () => {
  tables = await db.client.$queryRaw<TableInfo[]>`
    select c.relname as name,
      exists (select 1 from pg_attribute a
              where a.attrelid = c.oid and a.attname = 'tenant_id' and not a.attisdropped) as "hasTenantId",
      c.relrowsecurity as rls,
      c.relforcerowsecurity as forced,
      (select count(*)::int from pg_policy p where p.polrelid = c.oid) as policies,
      exists (select 1 from pg_index i
              join pg_attribute a on a.attrelid = c.oid and a.attnum = i.indkey[0]
              where i.indrelid = c.oid and a.attname = 'tenant_id') as "tenantIndex"
    from pg_class c
    where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
    order by c.relname`;
  tenantA = await seedTenant(db, 'Tenant A (teste)');
  tenantB = await seedTenant(db, 'Tenant B (teste)');
});

afterAll(async () => {
  await db.client.$disconnect();
});

const businessTables = () => tables.filter((t) => !PLATFORM_TABLES.has(t.name));

async function countAs(tenant: string, table: string, where: string): Promise<number> {
  return db.withTenant(tenant, async (tx) => {
    const rows = await tx.$queryRawUnsafe<{ n: number }[]>(
      `select count(*)::int as n from "${table}" where ${where}`,
    );
    return rows[0]?.n ?? -1;
  });
}

describe('tenant isolation (catalog-driven)', () => {
  it('finds the core tables', () => {
    expect(businessTables().length).toBeGreaterThanOrEqual(18);
  });

  it('every business table has tenant_id, forced RLS, a policy and a tenant_id index', () => {
    const broken = businessTables().filter(
      (t) => !t.hasTenantId || !t.rls || !t.forced || t.policies < 1 || !t.tenantIndex,
    );
    expect(broken).toEqual([]);
  });

  it('every business table has fixture rows for both tenants', async () => {
    for (const t of businessTables()) {
      expect(await countAs(tenantA, t.name, 'true'), t.name).toBeGreaterThan(0);
      expect(await countAs(tenantB, t.name, 'true'), t.name).toBeGreaterThan(0);
    }
  });

  it('tenant A sees none of tenant B rows', async () => {
    for (const t of businessTables()) {
      expect(await countAs(tenantA, t.name, `tenant_id = '${tenantB}'`), t.name).toBe(0);
      expect(await countAs(tenantA, t.name, `tenant_id <> '${tenantA}'`), t.name).toBe(0);
    }
  });

  it('tenant A cannot update or delete tenant B rows', async () => {
    for (const t of businessTables()) {
      const before = await countAs(tenantB, t.name, 'true');
      for (const sql of [
        `update "${t.name}" set tenant_id = tenant_id where tenant_id = '${tenantB}'`,
        `delete from "${t.name}" where tenant_id = '${tenantB}'`,
      ]) {
        const affected = await db
          .withTenant(tenantA, (tx) => tx.$executeRawUnsafe(sql))
          .catch((e: unknown) => {
            // audit_log: the app role may not update or delete at all.
            if (String(e).includes(PERMISSION_DENIED)) return 0;
            throw e;
          });
        expect(affected, `${t.name}: ${sql}`).toBe(0);
      }
      expect(await countAs(tenantB, t.name, 'true'), t.name).toBe(before);
    }
  });

  it('tenant A cannot insert rows for tenant B or move its rows to B', async () => {
    for (const t of businessTables()) {
      const copyAsB = `
        insert into "${t.name}"
        select (jsonb_populate_record(null::"${t.name}",
                to_jsonb(r) || jsonb_build_object('tenant_id', '${tenantB}', 'id', uuidv7()))).*
        from "${t.name}" r limit 1`;
      await expect(
        db.withTenant(tenantA, (tx) => tx.$executeRawUnsafe(copyAsB)),
        t.name,
      ).rejects.toThrow(/row-level security/);

      const moveToB = `update "${t.name}" set tenant_id = '${tenantB}'`;
      await expect(
        db.withTenant(tenantA, (tx) => tx.$executeRawUnsafe(moveToB)),
        t.name,
      ).rejects.toThrow(/row-level security|permission denied/);
    }
  });
});
