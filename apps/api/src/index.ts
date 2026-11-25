import { aiConfigured, createEnvGateway, dbUsageStore, markedStore } from '@app/ai';
import { AsaasClient, NodeEnv } from '@app/core';
import { createDb, INBOUND_QUEUE, QUEUE_SCHEMA, sendTenantJob } from '@app/db';
import { AlertEvent, initSentry, logProcessErrors } from '@app/observability';
import { PgBoss } from 'pg-boss';
import { buildApp } from './app.ts';
import { parseApiEnv } from './env.ts';
import { SIMULATOR_USAGE_PREFIX } from './simulator/simulator-routes.ts';

const LISTEN_HOST = '0.0.0.0';
const QUEUE_ERROR = 'queue error';
const NO_EMAIL_PROVIDER = 'No email provider configured for production (E-00f).';

const env = parseApiEnv(process.env);
const sentryOn = initSentry({
  service: 'api',
  dsn: env.SENTRY_DSN,
  release: env.APP_RELEASE,
  environment: env.NODE_ENV,
});
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
  ...(env.ASAAS_API_KEY
    ? { billing: new AsaasClient({ apiKey: env.ASAAS_API_KEY, baseUrl: env.ASAAS_BASE_URL }) }
    : {}),
  checkQueue: () => boss.getQueues(),
  ...(simulatorGateway ? { simulatorGateway } : {}),
});
boss.on('error', (error) => {
  app.alert(AlertEvent.queueError);
  app.log.error({ err: error }, QUEUE_ERROR);
});
if (!sentryOn) logProcessErrors(app.log);
await app.listen({ port: env.PORT, host: LISTEN_HOST });
