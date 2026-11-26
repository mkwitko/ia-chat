import { addDays } from '@app/core';
import {
  AgendaFailure,
  AppointmentStatus,
  dayBounds,
  loadScope,
  localDayRange,
  slotsIn,
  type Tx,
} from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { notFound, tenantOf } from '../setup/guarded.ts';
import { calendarOf } from './booking-routes.ts';
import { daySchema, toLocalDate } from './schemas.ts';
import { waitlistView } from './waitlist-routes.ts';

// Spec 10, "Agenda": what the day and week views show, the free slots a tap books, and the
// patients a manual booking can pick.

const AGENDA_PATH = '/api/agenda';
const SLOTS_PATH = '/api/agenda/slots';
const PATIENTS_PATH = '/api/patients';
const MAX_DAYS = 14;
const PATIENT_LIMIT = 20;
const MAX_QUERY = 80;

const rangeQuery = z.object({
  /** Local day the view starts on; today (tenant zone) when omitted. */
  from: daySchema.optional(),
  days: z.coerce.number().int().min(1).max(MAX_DAYS).default(1),
});
const slotsQuery = z.object({ day: daySchema, serviceId: z.uuid() });
const patientsQuery = z.object({ q: z.string().trim().max(MAX_QUERY).default('') });

export function registerAgendaViewRoutes(app: FastifyInstance): void {
  const read = { preHandler: requireTenant(Permission.agendaRead) };
  const book = { preHandler: requireTenant(Permission.agendaBook) };
  app.get(AGENDA_PATH, read, listAgenda);
  app.get(SLOTS_PATH, book, freeSlots);
  app.get(PATIENTS_PATH, book, findPatients);
}

function invalid(reply: FastifyReply) {
  return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
}

function listAgenda(request: FastifyRequest, reply: FastifyReply) {
  const query = rangeQuery.safeParse(request.query);
  if (!query.success) return invalid(reply);
  const tenant = tenantOf(request);
  return tenant.withTenant(async (tx) => {
    const { timezone } = await tx.tenant.findUniqueOrThrow({
      where: { id: tenant.tenantId },
      select: { timezone: true },
    });
    const from = query.data.from ?? localDayRange(new Date(), timezone).day;
    const first = toLocalDate(from);
    const start = dayBounds(first, timezone).start;
    const end = dayBounds(addDays(first, query.data.days - 1), timezone).end;
    return { timezone, from, ...(await agendaBetween(tx, { start, end })) };
  });
}

async function agendaBetween(tx: Tx, { start, end }: { start: Date; end: Date }) {
  const [appointments, timeOffs, waitlist] = await Promise.all([
    tx.appointment.findMany({
      where: { status: { not: AppointmentStatus.cancelled }, startsAt: { gte: start, lt: end } },
      include: { service: true, contact: true },
      orderBy: { startsAt: 'asc' },
    }),
    tx.timeOff.findMany({
      where: { startsAt: { lt: end }, endsAt: { gt: start } },
      orderBy: { startsAt: 'asc' },
      select: { id: true, startsAt: true, endsAt: true, kind: true, reason: true },
    }),
    waitlistView(tx, { start, end }),
  ]);
  return {
    appointments: appointments.map((row) => ({
      id: row.id,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      status: row.status,
      createdBy: row.createdBy,
      calendarSync: row.calendarSync,
      serviceId: row.serviceId,
      serviceName: row.service.name,
      patientName: row.contact.name,
      patientPhone: row.contact.phoneE164,
    })),
    timeOffs,
    waitlist,
  };
}

async function freeSlots(request: FastifyRequest, reply: FastifyReply) {
  const query = slotsQuery.safeParse(request.query);
  if (!query.success) return invalid(reply);
  const tenant = tenantOf(request);
  const calendar = await calendarOf(request, tenant);
  const slots = await tenant
    .withTenant(async (tx) => {
      if ((await tx.professional.count()) === 0) return [];
      const scope = await loadScope(tx);
      const service = await tx.service.findFirst({
        where: { id: query.data.serviceId, active: true },
      });
      if (!service) return null;
      const { start, end } = dayBounds(toLocalDate(query.data.day), scope.timezone);
      const now = new Date();
      return slotsIn(tx, {
        ...scope,
        durationMinutes: service.durationMinutes,
        calendar,
        from: start > now ? start : now,
        to: end,
        now,
      });
    })
    .catch((error: unknown) => {
      // Google could not be read: no slots are offered (A-13).
      if (error instanceof AgendaFailure) return error;
      throw error;
    });
  if (slots instanceof AgendaFailure)
    return reply.code(HttpStatus.conflict).send({ error: slots.code });
  if (!slots) return notFound(reply);
  return { slots: slots.map(({ start, end }) => ({ startsAt: start, endsAt: end })) };
}

async function findPatients(request: FastifyRequest, reply: FastifyReply) {
  const query = patientsQuery.safeParse(request.query);
  if (!query.success) return invalid(reply);
  const { q } = query.data;
  const patients = await tenantOf(request).withTenant((tx) =>
    tx.contact.findMany({
      where: q
        ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { phoneE164: { contains: q } }] }
        : {},
      orderBy: { updatedAt: 'desc' },
      take: PATIENT_LIMIT,
      select: { id: true, name: true, phoneE164: true },
    }),
  );
  return { patients };
}
