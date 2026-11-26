import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/agenda/*; the web does not import server code. Instants are ISO strings
// in UTC; the tenant's timezone comes with the response (RN-58).

export const TimeOffKind = { block: 'block', vacation: 'vacation' } as const;
export type TimeOffKind = (typeof TimeOffKind)[keyof typeof TimeOffKind];

export const CreatedBy = { ai: 'ai', human: 'human' } as const;
export const CalendarSync = { failed: 'failed' } as const;

export interface AppointmentItem {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  createdBy: string;
  /** `failed`: the Google event was not written (E-21). */
  calendarSync: string;
  serviceId: string;
  serviceName: string;
  professionalId: string;
  patientName: string | null;
  patientPhone: string | null;
}
export interface TimeOffItem {
  id: string;
  kind: TimeOffKind;
  startsAt: string;
  endsAt: string;
  reason: string | null;
  professionalId: string;
}
/** M-09: a client waiting for a slot of this service to open inside the window. */
export interface WaitlistItem {
  id: string;
  serviceName: string;
  patientName: string | null;
  patientPhone: string | null;
  windowStart: string;
  windowEnd: string;
}
export interface ProfessionalRef {
  id: string;
  name: string;
}
export interface AgendaView {
  timezone: string;
  /** Oldest first; more than one turns on the filter and the labels (spec 10, "Agenda"). */
  professionals: ProfessionalRef[];
  from: string;
  appointments: AppointmentItem[];
  timeOffs: TimeOffItem[];
  waitlist: WaitlistItem[];
}
export interface Slot {
  startsAt: string;
  endsAt: string;
  professionalId: string;
  professionalName: string;
}
export interface Patient {
  id: string;
  name: string | null;
  phoneE164: string | null;
}
export interface RuleWindow {
  weekday: number;
  start: string;
  end: string;
}
export interface AvailabilityView {
  timezone: string;
  nightlySummaryMinute: number;
  professionalId: string | null;
  rules: RuleWindow[];
}
export interface TimeOffInput {
  kind: TimeOffKind;
  fromDay: string;
  toDay: string;
  fromTime?: string;
  toTime?: string;
  reason: string | null;
}
export type PatientChoice = { contactId: string } | { newPatient: { name: string; phone: string } };
export interface BookInput {
  key: string;
  serviceId: string;
  professionalId: string;
  startsAt: string;
  patient: PatientChoice;
}

const Method = { post: 'POST', put: 'PUT', delete: 'DELETE' } as const;
export const Path = {
  agenda: '/api/agenda',
  slots: '/api/agenda/slots',
  appointments: '/api/agenda/appointments',
  summary: '/api/agenda/summary-time',
  patients: '/api/patients',
  availability: '/api/availability',
  timeOffs: '/api/time-offs',
  waitlist: '/api/agenda/waitlist',
} as const;

export const useAgenda = (from: string | undefined, days: number) =>
  useQuery({
    queryKey: [Path.agenda, from, days],
    queryFn: () =>
      api<AgendaView>(`${Path.agenda}?${new URLSearchParams(agendaParams(from, days))}`),
  });

function agendaParams(from: string | undefined, days: number): Record<string, string> {
  return { days: String(days), ...(from ? { from } : {}) };
}

export const useSlots = (day: string, serviceId: string) =>
  useQuery({
    queryKey: [Path.agenda, 'slots', day, serviceId],
    queryFn: () =>
      api<{ slots: Slot[] }>(`${Path.slots}?${new URLSearchParams({ day, serviceId })}`),
    enabled: Boolean(day && serviceId),
  });

export const usePatients = (q: string) =>
  useQuery({
    queryKey: [Path.patients, q],
    queryFn: () => api<{ patients: Patient[] }>(`${Path.patients}?${new URLSearchParams({ q })}`),
  });

/** Without a professional: the first one's (a one-professional tenant's agenda). */
const ofProfessional = (path: string, professionalId?: string) =>
  professionalId ? `${path}?${new URLSearchParams({ professionalId })}` : path;
const withProfessional = (professionalId?: string) => (professionalId ? { professionalId } : {});

export const useAvailability = (professionalId?: string) =>
  useQuery({
    queryKey: [Path.availability, professionalId],
    queryFn: () => api<AvailabilityView>(ofProfessional(Path.availability, professionalId)),
  });

export const useTimeOffs = (professionalId?: string) =>
  useQuery({
    queryKey: [Path.timeOffs, professionalId],
    queryFn: () => api<{ timeOffs: TimeOffItem[] }>(ofProfessional(Path.timeOffs, professionalId)),
  });

/** One mutation per action; every query under the same base is reloaded after. */
function useWrite<T>(bases: string[], call: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () =>
      Promise.all(bases.map((base) => client.invalidateQueries({ queryKey: [base] }))),
  });
}

export const useBook = () =>
  useWrite([Path.agenda], ({ patient, ...rest }: BookInput) =>
    api(Path.appointments, {
      method: Method.post,
      body: { ...rest, ...('contactId' in patient ? patient : { newPatient: patient.newPatient }) },
    }),
  );
export const useReschedule = () =>
  useWrite([Path.agenda], ({ id, ...body }: { id: string; key: string; startsAt: string }) =>
    api(`${Path.appointments}/${id}/reschedule`, { method: Method.post, body }),
  );
export const useCancel = () =>
  useWrite([Path.agenda], (id: string) =>
    api(`${Path.appointments}/${id}/cancel`, { method: Method.post, body: {} }),
  );
// The guided setup's hours step waits for a saved grid (H-39).
const ONBOARDING = '/api/onboarding';
export const useSaveRules = (professionalId?: string) =>
  useWrite([Path.availability, Path.agenda, ONBOARDING], (rules: RuleWindow[]) =>
    api(Path.availability, {
      method: Method.put,
      body: { rules, ...withProfessional(professionalId) },
    }),
  );
export const useSaveSummaryTime = () =>
  useWrite([Path.availability], (minute: number) =>
    api(Path.summary, { method: Method.put, body: { minute } }),
  );
export const useCreateTimeOff = (professionalId?: string) =>
  useWrite([Path.timeOffs, Path.agenda], (body: TimeOffInput) =>
    api<{ conflicts: number }>(Path.timeOffs, {
      method: Method.post,
      body: { ...body, ...withProfessional(professionalId) },
    }),
  );
export const useRemoveWaitlist = () =>
  useWrite([Path.agenda], (id: string) => api(`${Path.waitlist}/${id}`, { method: Method.delete }));
export const useRemoveTimeOff = () =>
  useWrite([Path.timeOffs, Path.agenda], (id: string) =>
    api(`${Path.timeOffs}/${id}`, { method: Method.delete }),
  );
