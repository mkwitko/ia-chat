import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/prisma/client.ts';

export type Tx = Prisma.TransactionClient;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface Db {
  /**
   * Runs fn in a transaction scoped to one tenant (RN-01). Every business query goes through here.
   * set_config(..., true) is local to the transaction, so a pooled connection never carries the
   * tenant into the next request.
   */
  withTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Unscoped client: only for tables without tenant_id. RLS still blocks tenant tables. */
  client: PrismaClient;
}

export function createDb(connectionString: string, pool: { max?: number } = {}): Db {
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString, ...pool }) });
  return {
    client,
    async withTenant(tenantId, fn) {
      if (!UUID.test(tenantId)) throw new Error('withTenant: tenantId must be a UUID');
      return client.$transaction(async (tx) => {
        await tx.$queryRaw`select set_config('app.tenant_id', ${tenantId}, true)`;
        return fn(tx);
      });
    },
  };
}
