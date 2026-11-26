import {
  AgendaError,
  AppointmentCreator,
  bookAppointment,
  cancelAppointment,
  confirmAppointment,
  listUpcoming,
  rescheduleAppointment,
  type AgendaResult,
  type AppointmentView,
} from '@app/db';
import { tool, type ToolSet } from 'ai';
import * as z from 'zod';
import {
  appointmentOutput,
  calendarOf,
  confirmationError,
  failure,
  findService,
  needsProfessional,
  serviceMissing,
  ToolError,
  AgendaToolName,
  availabilityTool,
} from '@app/agent';
import type { ToolContext } from './tools.ts';
import { waitlistTool } from './waitlist-tool.ts';

// Agenda plan tools (spec 04, "Ferramentas"; spec 05). Booking, moving and cancelling happen
// only after the patient confirmed a slot offered in an earlier turn; the code checks it.

export { AgendaToolName };

const MAX_NAME_LENGTH = 80;
/** M-09: a cancel by the client turns into a rebooking offer in the same conversation. */
const OFFER_REBOOK =
  'Pergunte se o cliente quer remarcar. Se quiser, use consultar_horarios e siga o fluxo de agendamento; se nenhum horário servir, ofereça a lista de espera.';

const confirmed = z
  .boolean()
  .describe('true só se o paciente já confirmou de forma explícita este horário');
const instant = z.iso.datetime({ offset: true });

export function agendaTools(context: ToolContext): ToolSet {
  return {
    [AgendaToolName.availability]: availabilityTool(context),
    [AgendaToolName.book]: bookTool(context),
    [AgendaToolName.reschedule]: rescheduleTool(context),
    [AgendaToolName.cancel]: cancelTool(context),
    [AgendaToolName.confirm]: confirmTool(context),
    [AgendaToolName.list]: listTool(context),
    [AgendaToolName.waitlist]: waitlistTool(context),
  };
}

function bookTool(context: ToolContext) {
  const { db, tenantId, contactId, turnId, now } = context;
  return tool({
    description:
      'Agenda o horário que o paciente escolheu e confirmou. O horário precisa ter sido oferecido em uma mensagem anterior (por consultar_horarios ou pelo aviso da lista de espera).',
    inputSchema: z.object({
      servico: z.string().min(1),
      inicio: instant,
      nome_paciente: z.string().min(1).max(MAX_NAME_LENGTH),
      confirmado: confirmed,
    }),
    execute: async ({ servico, inicio, nome_paciente, confirmado }) => {
      const service = await db.withTenant(tenantId, (tx) => findService(tx, servico));
      if (!service) return serviceMissing;
      const startsAt = new Date(inicio);
      const refused = await confirmationError(context, {
        serviceId: service.id,
        startsAt,
        confirmed: confirmado,
      });
      if (refused) return failure(refused);
      await rememberName(context, nome_paciente);
      const result = await bookAppointment(db, {
        tenantId,
        contactId,
        serviceId: service.id,
        startsAt,
        key: `${turnId}:${AgendaToolName.book}:${startsAt.toISOString()}`,
        createdBy: AppointmentCreator.ai,
        now,
        calendar: await calendarOf(context),
      });
      return outcome(context, result);
    },
  });
}

function rememberName({ db, tenantId, contactId }: ToolContext, name: string) {
  return db.withTenant(tenantId, (tx) =>
    tx.contact.updateMany({ where: { id: contactId, name: null }, data: { name } }),
  );
}

function rescheduleTool(context: ToolContext) {
  const { db, tenantId, contactId, turnId, now } = context;
  return tool({
    description:
      'Remarca um agendamento para o horário que o paciente escolheu e confirmou (oferecido antes por consultar_horarios). Se o novo horário falhar, o original continua.',
    inputSchema: z.object({
      agendamento: z.uuid(),
      novo_inicio: instant,
      confirmado: confirmed,
    }),
    execute: async ({ agendamento, novo_inicio, confirmado }) => {
      const current = await db.withTenant(tenantId, (tx) =>
        tx.appointment.findFirst({ where: { id: agendamento, contactId } }),
      );
      if (!current) return failure(AgendaError.appointmentNotFound);
      const startsAt = new Date(novo_inicio);
      const refused = await confirmationError(context, {
        serviceId: current.serviceId,
        startsAt,
        confirmed: confirmado,
      });
      if (refused) return failure(refused);
      const result = await rescheduleAppointment(db, {
        tenantId,
        contactId,
        appointmentId: agendamento,
        startsAt,
        key: `${turnId}:${AgendaToolName.reschedule}:${agendamento}:${startsAt.toISOString()}`,
        createdBy: AppointmentCreator.ai,
        now,
        calendar: await calendarOf(context),
      });
      return outcome(context, result);
    },
  });
}

function cancelTool(context: ToolContext) {
  const { db, tenantId, contactId, now } = context;
  return tool({
    description:
      'Cancela um agendamento do paciente depois que ele confirmou o cancelamento. Dentro da antecedência mínima, o pedido vai para o profissional.',
    inputSchema: z.object({
      agendamento: z.uuid(),
      motivo: z.string().optional(),
      confirmado: confirmed,
    }),
    // The reason stays out of the database: it can carry health information (privacy rule).
    execute: async ({ agendamento, confirmado }) => {
      if (!confirmado) return failure(ToolError.notConfirmed);
      const result = await cancelAppointment(db, {
        tenantId,
        contactId,
        appointmentId: agendamento,
        now,
        calendar: await calendarOf(context),
      });
      const done = outcome(context, result);
      return result.ok ? { ...done, proximo_passo: OFFER_REBOOK } : done;
    },
  });
}

function confirmTool(context: ToolContext) {
  const { db, tenantId, contactId, now } = context;
  return tool({
    description:
      'Marca como confirmado o agendamento do paciente quando ele responde "confirmar" a um lembrete.',
    inputSchema: z.object({ agendamento: z.uuid() }),
    execute: async ({ agendamento }) =>
      outcome(
        context,
        await confirmAppointment(db, { tenantId, contactId, appointmentId: agendamento, now }),
      ),
  });
}

function listTool({ db, tenantId, contactId, now, timezone }: ToolContext) {
  return tool({
    description: 'Lista os agendamentos futuros do paciente desta conversa.',
    inputSchema: z.object({}),
    execute: async () => {
      const upcoming = await listUpcoming(db, { tenantId, contactId, now });
      return { agendamentos: upcoming.map((one) => appointmentOutput(one, timezone)) };
    },
  });
}

/** A late cancellation or move, or a calendar that failed, goes to the professional (RF-44, A-13). */
function outcome(context: ToolContext, result: AgendaResult<AppointmentView>) {
  if (result.ok) return { agendamento: appointmentOutput(result.value, context.timezone) };
  if (result.error === AgendaError.tooLateToCancel || needsProfessional(result.error))
    context.effects.handoff = true;
  return failure(result.error);
}
