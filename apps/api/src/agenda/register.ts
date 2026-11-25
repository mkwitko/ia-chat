import type { FastifyInstance } from 'fastify';
import { registerAvailabilityRoutes } from './availability-routes.ts';
import { registerBookingRoutes } from './booking-routes.ts';
import { registerTimeOffRoutes } from './time-off-routes.ts';
import { registerAgendaViewRoutes } from './view-routes.ts';

/** E-22b and E-23: agenda view, manual booking, availability, blocks and vacation. */
export function registerAgendaRoutes(app: FastifyInstance): void {
  registerAgendaViewRoutes(app);
  registerBookingRoutes(app);
  registerAvailabilityRoutes(app);
  registerTimeOffRoutes(app);
}
