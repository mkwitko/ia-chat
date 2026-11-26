import {
  AgendaError,
  cancelAppointment,
  confirmAppointment,
  listUpcoming,
  PaymentStatus,
  type AgendaResult,
  type Db,
  type AppointmentView,
} from '@app/db';
import { tool } from 'ai';
import * as z from 'zod';
import { appointmentOutput, calendarOf, failure, needsProfessional, ToolError } from '@app/agent';
import type { ToolContext } from './tools.ts';
import { DEPOSIT_PAID, DEPOSIT_WAITING } from './deposit.ts';

// Agenda tools on an existing appointment: cancel, confirm, list (spec 04, "Ferramentas").

/** M-09: a cancel by the client turns into a rebooking offer in the same conversation. */
const OFFER_REBOOK =
  'Pergunte se o cliente quer remarcar. Se quiser, use consultar_horarios e siga o fluxo de agendamento; se nenhum horário servir, ofereça a lista de espera.';

const confirmed = z
  .boolean()
  .describe('true só se o paciente já confirmou de forma explícita este horário');

export function cancelTool(context: ToolContext) {
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

export function confirmTool(context: ToolContext) {
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

export function listTool({ db, tenantId, contactId, now, timezone }: ToolContext) {
  return tool({
    description: 'Lista os agendamentos futuros do paciente desta conversa.',
    inputSchema: z.object({}),
    execute: async () => {
      const upcoming = await listUpcoming(db, { tenantId, contactId, now });
      const deposits = await depositStates(db, tenantId, upcoming);
      return {
        agendamentos: upcoming.map((one) => ({
          ...appointmentOutput(one, timezone),
          ...(deposits.get(one.id) ? { situacao_sinal: deposits.get(one.id) } : {}),
        })),
      };
    },
  });
}

/** H-52: the deposit of each appointment, from the payments table only (never from an image). */
async function depositStates(db: Db, tenantId: string, upcoming: readonly AppointmentView[]) {
  const payments = await db.withTenant(tenantId, (tx) =>
    tx.payment.findMany({
      where: {
        appointmentId: { in: upcoming.map((one) => one.id) },
        status: { in: [PaymentStatus.pending, PaymentStatus.paid] },
      },
    }),
  );
  return new Map(
    payments.map((payment) => [
      payment.appointmentId,
      payment.status === PaymentStatus.paid ? DEPOSIT_PAID : DEPOSIT_WAITING,
    ]),
  );
}

/** A late cancellation or move, or a calendar that failed, goes to the professional (RF-44, A-13). */
export function outcome(context: ToolContext, result: AgendaResult<AppointmentView>) {
  if (result.ok) return { agendamento: appointmentOutput(result.value, context.timezone) };
  if (result.error === AgendaError.tooLateToCancel || needsProfessional(result.error))
    context.effects.handoff = true;
  return failure(result.error);
}
