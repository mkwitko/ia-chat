import { useNavigate } from 'react-router';
import { Route } from '@/routes';
import { CalendarState, useCalendarStatus } from '../calendar/calendar-api';
import { CalendarCopy } from '../calendar/calendar-copy';
import type { ServiceAlert } from './alert-bar';

/**
 * Spec 10, "Faixa de alerta" (A-13): with the Google token gone the assistant offers no slots,
 * which stops the service. Shown until the professional reconnects.
 */
export function useCalendarAlert(): ServiceAlert | null {
  const status = useCalendarStatus();
  const navigate = useNavigate();
  if (status.data?.state !== CalendarState.needsReconnect) return null;
  return {
    message: CalendarCopy.needsReconnect,
    action: CalendarCopy.bannerAction,
    onAction: () => void navigate(Route.agendaAvailability),
  };
}
