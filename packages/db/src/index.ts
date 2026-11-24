import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/prisma/client.ts';
import { INVALID_TENANT_ID, TENANT_SETTING, isUuid } from './tenant-context.ts';

export { TENANT_CONTEXT_MISSING, TENANT_SETTING } from './tenant-context.ts';
export * from '../generated/prisma/enums.ts';
export { Prisma } from '../generated/prisma/client.ts';

export type Tx = Prisma.TransactionClient;

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

export interface PoolOptions {
  max?: number;
}

export function createDb(connectionString: string, pool: PoolOptions = {}): Db {
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString, ...pool }) });
  return {
    client,
    async withTenant(tenantId, fn) {
      if (!isUuid(tenantId)) throw new Error(INVALID_TENANT_ID);
      return client.$transaction(async (tx) => {
        await tx.$queryRaw`select set_config(${TENANT_SETTING}, ${tenantId}, true)`;
        return fn(tx);
      });
    },
  };
}

export {
  DEFAULT_QUEUE_OPTIONS,
  INBOUND_QUEUE,
  RECONCILE_QUEUE,
  QUEUES,
  QUEUE_SCHEMA,
  deadLetterName,
  type QueueDefinition,
} from './queue/definitions.ts';
export {
  sendTenantJob,
  watchDeadLetters,
  workTenantQueue,
  type DeadLetter,
  type TenantJob,
} from './queue/tenant-job.ts';
