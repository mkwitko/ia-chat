import { aiConfigured, createEnvGateway, dbUsageStore, markedStore } from '@app/ai';
import { NodeEnv } from '@app/core';
import { createDb, INBOUND_QUEUE, QUEUE_SCHEMA, sendTenantJob } from '@app/db';
import { PgBoss } from 'pg-boss';
import { buildApp } from './app.ts';
import { parseApiEnv } from './env.ts';
import { SIMULATOR_USAGE_PREFIX } from './simulator/simulator-routes.ts';

const LISTEN_HOST = '0.0.0.0';
const NO_EMAIL_PROVIDER = 'No email provider configured for production (E-00f).';

const env = parseApiEnv(process.env);
if (env.NODE_ENV === NodeEnv.production) throw new Error(NO_EMAIL_PROVIDER);

// App role: the queues are created by `pnpm db:migrate` (RN-02).
const boss = new PgBoss({
  connectionString: env.DATABASE_URL,
  schema: QUEUE_SCHEMA,
  migrate: false,
});
await boss.start();
const enqueueInbound = async (tenantId: string, inboundEventId: string) => {
  await sendTenantJob({
    boss,
    queue: INBOUND_QUEUE.name,
    job: { tenantId, data: { inboundEventId } },
    options: { singletonKey: inboundEventId },
  });
};

const db = createDb(env.DATABASE_URL);
// Simulator (spec 10): same gateway as production, usage rows tagged `simulator:`.
const simulatorGateway = aiConfigured(env)
  ? createEnvGateway({
      db,
      env,
      nodeEnv: env.NODE_ENV,
      store: markedStore(dbUsageStore(db), SIMULATOR_USAGE_PREFIX),
    })
  : undefined;
const app = buildApp({
  env,
  db,
  enqueueInbound,
  ...(simulatorGateway ? { simulatorGateway } : {}),
});
await app.listen({ port: env.PORT, host: LISTEN_HOST });
