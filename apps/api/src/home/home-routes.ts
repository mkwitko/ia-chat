import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireTenant } from '../auth/tenant-guard.ts';
import { tenantOf } from '../setup/guarded.ts';
import { readHome } from './home-view.ts';

const PATH = '/api/home';

/** Spec 10, "Início". Any member. */
export function registerHomeRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant() }, home);
}

function home(request: FastifyRequest) {
  const tenant = tenantOf(request);
  return tenant.withTenant((tx) => readHome(tx, { tenantId: tenant.tenantId, now: new Date() }));
}
