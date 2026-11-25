import { phoneKey, toE164 } from '@app/channels';
import {
  AgendaError,
  AppointmentCreator,
  AppointmentStatus,
  ContactOrigin,
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  type AgendaResult,
  type Tx,
} from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant, type TenantContext } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { notFound, parsed } from '../setup/guarded.ts';
import { idParams } from './schemas.ts';

// RF-48: the professional books, moves and cancels through the same functions and the same
// exclusion constraint the assistant uses (spec 05). Only the notice window is waived for them.

const PATH = '/api/agenda/appointments';
const ITEM_PATH = '/api/agenda/appointments/:id';
const ENTITY = 'appointment';
const KEY_PREFIX = 'panel';
const MAX_NAME = 120;
const MAX_PHONE = 20;

const newPatient = z.object({
  name: z.string().trim().min(1).max(MAX_NAME),
  phone: z.string().trim().min(1).max(MAX_PHONE),
});
const bookSchema = z
  .object({
    key: z.uuid(),
    serviceId: z.uuid(),
    startsAt: z.iso.datetime({ offset: true }),
    contactId: z.uuid().optional(),
    newPatient: newPatient.optional(),
  })
  .strict()
  .refine((body) => Boolean(body.contactId) !== Boolean(body.newPatient));
const moveSchema = z.object({ key: z.uuid(), startsAt: z.iso.datetime({ offset: true }) }).strict();
const cancelSchema = z.object({}).strict();

export function registerBookingRoutes(app: FastifyInstance): void {
  const book = { preHandler: requireTenant(Permission.agendaBook) };
  app.post(PATH, book, createAppointment);
  app.post(`${ITEM_PATH}/reschedule`, book, rescheduleOne);
  app.post(`${ITEM_PATH}/cancel`, book, cancelOne);
}

/** The agenda's business errors are 409 with the code the panel translates. */
function failure(reply: FastifyReply, error: AgendaError) {
  const missing = error === AgendaError.appointmentNotFound;
  return missing
    ? reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound })
    : reply.code(HttpStatus.conflict).send({ error });
}

function respond(reply: FastifyReply, result: AgendaResult<unknown>, status: number) {
  return result.ok ? reply.code(status).send(result.value) : failure(reply, result.error);
}

/** The picked patient, or the one the phone already belongs to, or a new contact (needs a phone). */
async function contactFor(tx: Tx, tenantId: string, body: z.infer<typeof bookSchema>) {
  if (body.contactId) return tx.contact.findFirst({ where: { id: body.contactId } });
  const patient = body.newPatient;
  const key = patient ? phoneKey(patient.phone) : null;
  if (!patient || !key) return null;
  const known = await tx.contact.findUnique({
    where: { tenantId_phoneKey: { tenantId, phoneKey: key } },
  });
  if (known) return known;
  return tx.contact.create({
    data: {
      tenantId,
      name: patient.name,
      phoneKey: key,
      phoneE164: toE164(patient.phone),
      origin: ContactOrigin.manual,
    },
  });
}

async function createAppointment(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, bookSchema);
  if (!input) return reply;
  const { tenant, body } = input;
  const contact = await tenant.withTenant((tx) => contactFor(tx, tenant.tenantId, body));
  if (!contact) return notFound(reply);
  const result = await bookAppointment(request.server.db, {
    tenantId: tenant.tenantId,
    contactId: contact.id,
    serviceId: body.serviceId,
    startsAt: new Date(body.startsAt),
    key: `${KEY_PREFIX}:${body.key}`,
    createdBy: AppointmentCreator.human,
    now: new Date(),
  });
  if (result.ok) await record(tenant, result.value.id, AuditAction.create);
  return respond(reply, result, HttpStatus.created);
}

async function rescheduleOne(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, moveSchema);
  const params = idParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant, body } = input;
  const old = await liveAppointment(tenant, params.data.id);
  if (!old) return notFound(reply);
  const result = await rescheduleAppointment(request.server.db, {
    tenantId: tenant.tenantId,
    contactId: old.contactId,
    appointmentId: old.id,
    startsAt: new Date(body.startsAt),
    key: `${KEY_PREFIX}:${body.key}`,
    createdBy: AppointmentCreator.human,
    now: new Date(),
  });
  if (result.ok) await record(tenant, result.value.id, AuditAction.update);
  return respond(reply, result, HttpStatus.ok);
}

async function cancelOne(request: FastifyRequest, reply: FastifyReply) {
  const input = parsed(request, reply, cancelSchema);
  const params = idParams.safeParse(request.params);
  if (!input) return reply;
  if (!params.success) return notFound(reply);
  const { tenant } = input;
  const old = await liveAppointment(tenant, params.data.id);
  if (!old) return notFound(reply);
  const result = await cancelAppointment(request.server.db, {
    tenantId: tenant.tenantId,
    contactId: old.contactId,
    appointmentId: old.id,
    createdBy: AppointmentCreator.human,
    now: new Date(),
  });
  if (result.ok) await record(tenant, old.id, AuditAction.archive);
  return respond(reply, result, HttpStatus.ok);
}

/** RLS: another tenant's appointment is simply not found. */
function liveAppointment(tenant: TenantContext, id: string) {
  return tenant.withTenant((tx) =>
    tx.appointment.findFirst({ where: { id, status: { not: AppointmentStatus.cancelled } } }),
  );
}

/** Who did what to which appointment; no patient data in the entry (RN-38). */
function record(tenant: TenantContext, entityId: string, action: AuditAction) {
  return tenant.withTenant((tx) => audit(tx, tenant, { entity: ENTITY, entityId, action }));
}
