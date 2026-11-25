import {
  MAX_OPTIONS,
  MINUTES_PER_DAY,
  MS_PER_MINUTE,
  localParts,
  pickSpread,
  zonedToUtc,
} from '@app/core';
import {
  AgendaFailure,
  loadScope,
  recordOffers,
  slotsIn,
  vacationReturn,
  type CalendarLink,
  type Tx,
} from '@app/db';
import { tool } from 'ai';
import * as z from 'zod';
import {
  calendarOf,
  failure,
  findService,
  needsProfessional,
  serviceMissing,
  slotOutput,
  vacationOutput,
  type OfferContext,
} from './agenda-support.ts';

const Period = { morning: 'manha', afternoon: 'tarde', evening: 'noite' } as const;
const NOON_MINUTE = 720;
const EVENING_MINUTE = 1_080;
const SEARCH_DAYS = 14;

/** `record: false` (simulator) searches without leaving offered slots behind. */
export function availabilityTool(context: OfferContext, record = true) {
  return tool({
    description:
      'Consulta horários livres de um serviço (até 6 opções, espalhadas). Não reserva nada: proponha ao paciente e espere ele escolher. Se vier `ferias`, o profissional está de férias: diga ao paciente a data de retorno exatamente como veio.',
    inputSchema: z.object({
      servico: z.string().min(1),
      a_partir_de: z.iso.date().describe('AAAA-MM-DD, no fuso do consultório'),
      periodo: z.enum(Object.values(Period)).optional(),
    }),
    execute: (query) => offered(context, { record, query }),
  });
}

/** An unreadable calendar offers nothing and hands the patient to the professional (A-13). */
async function offered(
  context: OfferContext,
  { record, query }: { record: boolean; query: AvailabilityQuery },
) {
  const calendar = await calendarOf(context);
  try {
    return await context.db.withTenant(context.tenantId, (tx) =>
      offerSlots(tx, { context, record, calendar }, query),
    );
  } catch (error) {
    if (!(error instanceof AgendaFailure) || !needsProfessional(error.code)) throw error;
    if (context.effects) context.effects.handoff = true;
    return failure(error.code);
  }
}

interface OfferRun {
  context: OfferContext;
  record: boolean;
  calendar: CalendarLink | undefined;
}

interface AvailabilityQuery {
  servico: string;
  a_partir_de: string;
  periodo?: string | undefined;
}

async function offerSlots(
  tx: Tx,
  { context, record, calendar }: OfferRun,
  query: AvailabilityQuery,
) {
  const { conversationId, now } = context;
  const service = await findService(tx, query.servico);
  if (!service) return serviceMissing;
  const scope = await loadScope(tx);
  const [year = 0, month = 0, day = 0] = query.a_partir_de.split('-').map(Number);
  const start = zonedToUtc({ year, month, day }, 0, scope.timezone);
  const from = start > now ? start : now;
  const to = new Date(from.getTime() + SEARCH_DAYS * MINUTES_PER_DAY * MS_PER_MINUTE);
  const slots = await slotsIn(tx, {
    ...scope,
    durationMinutes: service.durationMinutes,
    calendar,
    from,
    to,
    now,
  });
  const inPeriod = slots.filter((slot) => periodMatches(slot.start, scope.timezone, query.periodo));
  const options = pickSpread(inPeriod, { timezone: scope.timezone, max: MAX_OPTIONS });
  if (record)
    await recordOffers(tx, {
      conversationId,
      serviceId: service.id,
      now,
      slots: options.map((slot) => slot.start),
    });
  const back = await vacationReturn(tx, { from, to });
  return {
    opcoes: options.map((slot) => slotOutput(slot, scope.timezone)),
    ...(back ? vacationOutput(back, scope.timezone) : {}),
  };
}

function periodMatches(start: Date, timezone: string, period: string | undefined): boolean {
  if (!period) return true;
  const { minuteOfDay } = localParts(start, timezone);
  if (period === Period.morning) return minuteOfDay < NOON_MINUTE;
  if (period === Period.afternoon)
    return minuteOfDay >= NOON_MINUTE && minuteOfDay < EVENING_MINUTE;
  return minuteOfDay >= EVENING_MINUTE;
}
