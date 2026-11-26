import { AgendaError, AppointmentCreator, bookAppointment, rescheduleAppointment } from '@app/db';
import { tool, type ToolSet } from 'ai';
import * as z from 'zod';
import {
  calendarOf,
  confirmedSlot,
  failure,
  findService,
  professionalArg,
  serviceMissing,
  wantedProfessional,
  AgendaToolName,
  availabilityTool,
} from '@app/agent';
import { cancelTool, confirmTool, listTool, outcome } from './appointment-tools.ts';
import type { ToolContext } from './tools.ts';
import { waitlistTool } from './waitlist-tool.ts';
import { depositHold, depositOutput } from './deposit.ts';

// Agenda plan tools (spec 04, "Ferramentas"; spec 05). Booking, moving and cancelling happen
// only after the patient confirmed a slot offered in an earlier turn; the code checks it.

export { AgendaToolName };

const MAX_NAME_LENGTH = 80;

const confirmed = z
  .boolean()
  .describe('true só se o paciente já confirmou de forma explícita este horário');
const instant = z.iso.datetime({ offset: true });

interface SlotChoice {
  serviceId: string;
  startsAt: Date;
  confirmado: boolean;
  profissional: string | undefined;
}

/** Who serves the confirmed slot, or the refusal to hand back (unknown name, not confirmed). */
async function gateOf(context: ToolContext, choice: SlotChoice) {
  const wanted = await context.db.withTenant(context.tenantId, (tx) =>
    wantedProfessional(tx, choice.profissional),
  );
  if (!wanted.ok) return { refusal: wanted.refusal };
  const gate = await confirmedSlot(context, {
    serviceId: choice.serviceId,
    startsAt: choice.startsAt,
    confirmed: choice.confirmado,
    professionalId: wanted.id,
  });
  return gate.ok ? { professionalId: gate.professionalId } : { refusal: failure(gate.error) };
}

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
      profissional: professionalArg,
    }),
    execute: async ({ servico, inicio, nome_paciente, confirmado, profissional }) => {
      const service = await db.withTenant(tenantId, (tx) => findService(tx, servico));
      if (!service) return serviceMissing;
      const startsAt = new Date(inicio);
      const choice = { serviceId: service.id, startsAt, confirmado, profissional };
      const gate = await gateOf(context, choice);
      if (gate.refusal) return gate.refusal;
      await rememberName(context, nome_paciente);
      const deposit = await depositHold(context, service);
      const result = await bookAppointment(db, {
        tenantId,
        contactId,
        serviceId: service.id,
        professionalId: gate.professionalId,
        startsAt,
        key: `${turnId}:${AgendaToolName.book}:${startsAt.toISOString()}`,
        createdBy: AppointmentCreator.ai,
        now,
        calendar: await calendarOf(context),
        deposit,
      });
      const done = outcome(context, result);
      return deposit && result.ok
        ? { ...done, ...(await depositOutput(context, result.value.id)) }
        : done;
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
      profissional: professionalArg,
    }),
    execute: async ({ agendamento, novo_inicio, confirmado, profissional }) => {
      const current = await db.withTenant(tenantId, (tx) =>
        tx.appointment.findFirst({ where: { id: agendamento, contactId } }),
      );
      if (!current) return failure(AgendaError.appointmentNotFound);
      const startsAt = new Date(novo_inicio);
      const choice = { serviceId: current.serviceId, startsAt, confirmado, profissional };
      const gate = await gateOf(context, choice);
      if (gate.refusal) return gate.refusal;
      const result = await rescheduleAppointment(db, {
        tenantId,
        contactId,
        appointmentId: agendamento,
        professionalId: gate.professionalId,
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
