import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/calendar/*; the web does not import server code.

export const CalendarState = {
  off: 'off',
  notConnected: 'not_connected',
  chooseCalendar: 'choose_calendar',
  connected: 'connected',
  needsReconnect: 'needs_reconnect',
} as const;
export type CalendarState = (typeof CalendarState)[keyof typeof CalendarState];

export interface CalendarStatus {
  state: CalendarState;
  calendarName: string | null;
}
export interface OwnedCalendar {
  id: string;
  name: string;
}

const BASE = '/api/calendar/google';
const Method = { post: 'POST', put: 'PUT', delete: 'DELETE' } as const;

export const useCalendarStatus = () =>
  useQuery({ queryKey: [BASE], queryFn: () => api<CalendarStatus>(BASE) });

export const useOwnedCalendars = (enabled: boolean) =>
  useQuery({
    queryKey: [BASE, 'calendars'],
    queryFn: () => api<{ calendars: OwnedCalendar[] }>(`${BASE}/calendars`),
    enabled,
    retry: false,
  });

export const useConnectGoogle = () =>
  useMutation({
    mutationFn: () => api<{ url: string }>(`${BASE}/connect`, { method: Method.post, body: {} }),
    // The consent happens on Google's page; it brings the user back to the panel.
    onSuccess: ({ url }) => {
      window.location.assign(url);
    },
  });

function useWrite<T>(call: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () => client.invalidateQueries({ queryKey: [BASE] }),
  });
}

export const useChooseCalendar = () =>
  useWrite((calendarId: string) =>
    api(`${BASE}/calendar`, { method: Method.put, body: { calendarId } }),
  );
export const useDisconnectGoogle = () => useWrite(() => api(BASE, { method: Method.delete }));
