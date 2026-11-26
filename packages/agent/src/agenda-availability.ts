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
  performersOf,
  recordOffers,
  slotsAcross,
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
  professionalArg,
  serviceMissing,
  slotOutput,
  vacationOutput,
  wantedProfessional,
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
      'Consulta horários livres de um serviço (até 6 opções, espalhadas). Cada opção traz o `profissional`: diga o nome junto do horário. Não reserva nada: proponha ao paciente e espere ele escolher. Se vier `ferias`, o profissional está de férias: diga ao paciente a data de retorno exatamente como veio.',
    inputSchema: z.object({
      servico: z.string().min(1),
      a_partir_de: z.iso.date().describe('AAAA-MM-DD, no fuso do consultório'),
      periodo: z.enum(Object.values(Period)).optional(),
      profissional: professionalArg,
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
  profissional?: string | undefined;
}

async function offerSlots(tx: Tx, run: OfferRun, query: AvailabilityQuery) {
  const { conversationId, now } = run.context;
  const service = await findService(tx, query.servico);
  if (!service) return serviceMissing;
  const wanted = await wantedProfessional(tx, query.profissional);
  if (!wanted.ok) return wanted.refusal;
  const { timezone } = await loadScope(tx);
  const window = searchWindow(query.a_partir_de, { timezone, now });
  const scope = { serviceId: service.id, professionalId: wanted.id };
  const slots = await slotsAcross(tx, {
    ...scope,
    ...window,
    timezone,
    durationMinutes: service.durationMinutes,
    calendar: run.calendar,
    now,
  });
  // One option per time: with nobody named, the oldest free professional takes it.
  const inPeriod = slots.filter(
    (slot, index) =>
      slots[index - 1]?.start.getTime() !== slot.start.getTime() &&
      periodMatches(slot.start, timezone, query.periodo),
  );
  const options = pickSpread(inPeriod, { timezone, max: MAX_OPTIONS });
  if (run.record)
    await recordOffers(tx, { conversationId, serviceId: service.id, now, slots: options });
  const back = await soleVacation(tx, { ...scope, ...window });
  return {
    opcoes: options.map((slot) => ({
      ...slotOutput(slot, timezone),
      profissional: slot.professionalName,
    })),
    ...(back ? vacationOutput(back, timezone) : {}),
  };
}

function searchWindow(day: string, { timezone, now }: { timezone: string; now: Date }) {
  const [year = 0, month = 0, date = 0] = day.split('-').map(Number);
  const start = zonedToUtc({ year, month, day: date }, 0, timezone);
  const from = start > now ? start : now;
  return { from, to: new Date(from.getTime() + SEARCH_DAYS * MINUTES_PER_DAY * MS_PER_MINUTE) };
}

/** RF-14 per professional: the notice only when one professional is in play (named or the only one). */
async function soleVacation(
  tx: Tx,
  query: { serviceId: string; professionalId: string | undefined; from: Date; to: Date },
) {
  const performers = await performersOf(tx, query);
  const [only] = performers;
  if (performers.length !== 1 || !only) return null;
  return vacationReturn(tx, { from: query.from, to: query.to, professionalId: only.id });
}

function periodMatches(start: Date, timezone: string, period: string | undefined): boolean {
  if (!period) return true;
  const { minuteOfDay } = localParts(start, timezone);
  if (period === Period.morning) return minuteOfDay < NOON_MINUTE;
  if (period === Period.afternoon)
    return minuteOfDay >= NOON_MINUTE && minuteOfDay < EVENING_MINUTE;
  return minuteOfDay >= EVENING_MINUTE;
}
