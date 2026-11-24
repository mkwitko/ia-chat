import { local } from './calendar.ts';
import { BUSY, HOURS, MIN_CANCEL_HOURS, NOW, SERVICES, type Service } from './data/clinic.ts';

// In-memory agenda of the fictitious clinic. The real one (E-19) reads Postgres and Google.

export const AppointmentStatus = { booked: 'booked', cancelled: 'cancelled' } as const;
type AppointmentStatus = (typeof AppointmentStatus)[keyof typeof AppointmentStatus];

export const Period = { morning: 'manha', afternoon: 'tarde' } as const;
export type Period = (typeof Period)[keyof typeof Period];

export const AgendaError = {
  unknownService: 'unknown_service',
  notBookable: 'not_bookable',
  outsideHours: 'outside_hours',
  inPast: 'in_past',
  slotTaken: 'slot_taken',
  notFound: 'not_found',
  tooLate: 'too_late',
} as const;
export type AgendaError = (typeof AgendaError)[keyof typeof AgendaError];
/** Outcome of a write: the appointment it touched, or why it failed. */
export interface AgendaResult {
  appointment: Appointment | null;
  error: AgendaError | null;
}

const done = (appointment: Appointment): AgendaResult => ({ appointment, error: null });
const failed = (error: AgendaError): AgendaResult => ({ appointment: null, error });

export interface Appointment {
  id: string;
  serviceId: string;
  start: Date;
  end: Date;
  mine: boolean;
  status: AppointmentStatus;
}

export interface MyAppointment {
  serviceId: string;
  start: string;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const MINUTES_PER_HOUR = 60;
const SEARCH_DAYS = 14;
const MAX_SLOTS = 6;
const NOON = 12;

export type Agenda = ReturnType<typeof createAgenda>;

export function createAgenda(mine?: MyAppointment) {
  const appointments: Appointment[] = BUSY.map((busy, index) =>
    appointment(`busy-${String(index)}`, busy, false),
  );
  if (mine) appointments.push(appointment('meu-agendamento', mine, true));
  let sequence = 0;
  const nextId = () => {
    sequence += 1;
    return `ag-${String(sequence)}`;
  };
  return {
    appointments,
    slots: (serviceId: string, from: Date, period?: Period) =>
      slots(appointments, serviceId, { from, period }),
    book: (serviceId: string, start: Date) =>
      book(appointments, { serviceId, start, id: nextId() }),
    cancel: (id: string) => cancel(appointments, id),
    reschedule: (id: string, start: Date) =>
      reschedule(appointments, { id, start, newId: nextId() }),
    mine: () =>
      appointments.filter((item) => item.mine && item.status === AppointmentStatus.booked),
  };
}

export function serviceById(id: string): Service | undefined {
  return SERVICES.find((service) => service.id === id);
}

function appointment(id: string, { serviceId, start }: MyAppointment, mine: boolean): Appointment {
  const begin = new Date(start);
  const minutes = serviceById(serviceId)?.minutes ?? 0;
  return {
    id,
    serviceId,
    start: begin,
    end: new Date(begin.getTime() + minutes * MINUTE_MS),
    mine,
    status: AppointmentStatus.booked,
  };
}

function slots(
  appointments: readonly Appointment[],
  serviceId: string,
  query: { from: Date; period?: Period | undefined },
): Date[] {
  const service = serviceById(serviceId);
  if (!service?.bookable) return [];
  const firstDay = local(query.from).dayStart.getTime();
  const found: Date[] = [];
  for (let day = 0; day < SEARCH_DAYS && found.length < MAX_SLOTS; day += 1) {
    const candidates = dayStarts(new Date(firstDay + day * DAY_MS), service.minutes);
    found.push(
      ...candidates.filter(
        (start) =>
          inPeriod(start, query.period) && check(appointments, { service, start }) === null,
      ),
    );
  }
  return found.slice(0, MAX_SLOTS);
}

function dayStarts(dayStart: Date, minutes: number): Date[] {
  const windows = HOURS[local(dayStart).weekday] ?? [];
  return windows.flatMap(([open, close]) => {
    const starts: Date[] = [];
    for (
      let hour = open;
      hour * MINUTES_PER_HOUR + minutes <= close * MINUTES_PER_HOUR;
      hour += 1
    ) {
      starts.push(new Date(dayStart.getTime() + hour * HOUR_MS));
    }
    return starts;
  });
}

function inPeriod(start: Date, period?: Period): boolean {
  if (!period) return true;
  const morning = local(start).hour < NOON;
  return period === Period.morning ? morning : !morning;
}

/** Null when the service fits at that start; otherwise why not. */
function check(
  appointments: readonly Appointment[],
  { service, start, ignoreId }: { service: Service; start: Date; ignoreId?: string },
): AgendaError | null {
  if (start.getTime() <= NOW.getTime()) return AgendaError.inPast;
  if (!withinHours(start, service.minutes)) return AgendaError.outsideHours;
  const end = start.getTime() + service.minutes * MINUTE_MS;
  const taken = appointments.some(
    (item) =>
      item.id !== ignoreId &&
      item.status === AppointmentStatus.booked &&
      item.start.getTime() < end &&
      item.end.getTime() > start.getTime(),
  );
  return taken ? AgendaError.slotTaken : null;
}

function withinHours(start: Date, minutes: number): boolean {
  const { weekday, hour, minute } = local(start);
  if (minute !== 0) return false;
  const begin = hour * MINUTES_PER_HOUR;
  return (HOURS[weekday] ?? []).some(
    ([open, close]) =>
      begin >= open * MINUTES_PER_HOUR && begin + minutes <= close * MINUTES_PER_HOUR,
  );
}

function book(
  appointments: Appointment[],
  { serviceId, start, id }: { serviceId: string; start: Date; id: string },
): AgendaResult {
  const service = serviceById(serviceId);
  if (!service) return failed(AgendaError.unknownService);
  if (!service.bookable) return failed(AgendaError.notBookable);
  const problem = check(appointments, { service, start });
  if (problem) return failed(problem);
  const created = appointment(id, { serviceId, start: start.toISOString() }, true);
  appointments.push(created);
  return done(created);
}

/** The contact's own booked appointment, if it can still change (24 hours notice). */
function changeable(appointments: readonly Appointment[], id: string): AgendaResult {
  const target = appointments.find(
    (item) => item.id === id && item.mine && item.status === AppointmentStatus.booked,
  );
  if (!target) return failed(AgendaError.notFound);
  const notice = target.start.getTime() - NOW.getTime();
  return notice < MIN_CANCEL_HOURS * HOUR_MS ? failed(AgendaError.tooLate) : done(target);
}

function cancel(appointments: readonly Appointment[], id: string): AgendaResult {
  const found = changeable(appointments, id);
  if (found.appointment) found.appointment.status = AppointmentStatus.cancelled;
  return found;
}

function reschedule(
  appointments: Appointment[],
  { id, start, newId }: { id: string; start: Date; newId: string },
): AgendaResult {
  const target = changeable(appointments, id).appointment;
  if (!target) return changeable(appointments, id);
  const service = serviceById(target.serviceId);
  if (!service) return failed(AgendaError.unknownService);
  const problem = check(appointments, { service, start, ignoreId: id });
  if (problem) return failed(problem);
  target.status = AppointmentStatus.cancelled;
  const created = appointment(
    newId,
    { serviceId: target.serviceId, start: start.toISOString() },
    true,
  );
  appointments.push(created);
  return done(created);
}
