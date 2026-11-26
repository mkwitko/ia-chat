import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Origin } from '../customers/customers-types';

// Mirrors GET /api/results; the web does not import server code.

export const Period = {
  month: 'month',
  lastMonth: 'last_month',
  last90Days: 'last_90_days',
} as const;
export type Period = (typeof Period)[keyof typeof Period];

export interface ResultsView {
  period: Period;
  range: { start: string; end: string };
  timezone: string;
  minSample: number;
  dataSince: string | null;
  conversations: number;
  newContacts: number;
  byOrigin: { origin: Origin; count: number }[];
  referrals: number;
  firstResponse: { sample: number; medianSeconds: number | null };
  escalation: { handedOff: number; total: number };
  appointments: { booked: number; rescheduled: number; cancelled: number };
  attendance: { attended: number; noShow: number; unmarked: number };
  recovered: number;
  repeatBookings: number;
}

export const useResults = (period: Period) =>
  useQuery({
    queryKey: ['results', period],
    placeholderData: keepPreviousData,
    queryFn: () => api<ResultsView>(`/api/results?${new URLSearchParams({ period })}`),
  });
