import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireTenant } from '../auth/tenant-guard.ts';
import { tenantOf } from '../setup/guarded.ts';
import { readHome } from './home-view.ts';

const PATH = '/api/home';
const FIRST_BOOKING_PATH = '/api/home/first-booking-seen';

/** Spec 10, "Início". Any member. */
export function registerHomeRoutes(app: FastifyInstance): void {
  app.get(PATH, { preHandler: requireTenant() }, home);
  app.post(FIRST_BOOKING_PATH, { preHandler: requireTenant() }, firstBookingSeen);
}

/** The "first booking" card is closed for the whole account, once (the first close wins). */
async function firstBookingSeen(request: FastifyRequest) {
  const tenant = tenantOf(request);
  await tenant.withTenant((tx) =>
    tx.tenant.updateMany({
      where: { id: tenant.tenantId, firstBookingSeenAt: null },
      data: { firstBookingSeenAt: new Date() },
    }),
  );
  return { seen: true };
}

function home(request: FastifyRequest) {
  const tenant = tenantOf(request);
  return tenant.withTenant((tx) => readHome(tx, { tenantId: tenant.tenantId, now: new Date() }));
}
