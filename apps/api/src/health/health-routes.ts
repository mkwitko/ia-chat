import { readinessStatus, runChecks, type Checks } from '@app/observability';
import type { FastifyInstance } from 'fastify';

const HEALTH_PATH = '/health';
const READY_PATH = '/ready';

export interface HealthDeps {
  /** Reachability of pg-boss; without it only the database is checked. */
  checkQueue?: (() => Promise<unknown>) | undefined;
}

/** Liveness (the process answers) and readiness (database and queue answer). Public, no detail. */
export function registerHealthRoutes(app: FastifyInstance, { checkQueue }: HealthDeps): void {
  const checks: Checks = {
    database: () => app.db.client.$queryRaw`select 1`,
    ...(checkQueue ? { queue: checkQueue } : {}),
  };
  app.get(HEALTH_PATH, () => ({ status: 'ok' }));
  app.get(READY_PATH, async (_request, reply) => {
    const result = await runChecks(checks);
    return reply.code(readinessStatus(result)).send(result);
  });
}
