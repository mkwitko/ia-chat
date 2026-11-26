import type { FastifyInstance } from 'fastify';
import { registerAvailabilityRoutes } from './availability-routes.ts';
import { registerAttendanceRoute } from './attendance-route.ts';
import { registerBookingRoutes } from './booking-routes.ts';
import { registerTimeOffRoutes } from './time-off-routes.ts';
import { registerAgendaViewRoutes } from './view-routes.ts';
import { registerWaitlistRoutes } from './waitlist-routes.ts';

/** E-22b, E-23 and M-09: agenda view, manual booking, availability, blocks, vacation, waitlist. */
export function registerAgendaRoutes(app: FastifyInstance): void {
  registerAgendaViewRoutes(app);
  registerBookingRoutes(app);
  registerAttendanceRoute(app);
  registerAvailabilityRoutes(app);
  registerTimeOffRoutes(app);
  registerWaitlistRoutes(app);
}
