import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { HOME_KEY } from '../customers/customers-api';
import type { CustomerSummary } from '../customers/customers-types';
import type { ConversationSummary } from '../inbox/inbox-api';
import type { RecoveredFigure } from '../results/recovered';

// Mirrors GET /api/home; the web does not import server code.

export interface HomeAppointment {
  id: string;
  startsAt: string;
  status: string;
  contactId: string;
  patientName: string | null;
  serviceName: string;
}

export interface EndingPackage {
  id: string;
  contactId: string;
  contactName: string | null;
  name: string;
  sessions: number;
  remaining: number;
}

export interface HomeView {
  timezone: string;
  month: { contacts: number; booked: number; awaiting: number; cancelled: number };
  recovered: RecoveredFigure;
  attention: {
    conversations: ConversationSummary[];
    drafts: number;
    unanswered: number;
    toMark: HomeAppointment[];
    endingPackages: EndingPackage[];
  };
  today: HomeAppointment[];
  toConfirm: HomeAppointment[];
  notBooked: { count: number; recoverable: number; items: CustomerSummary[] };
}

export const useHome = () =>
  useQuery({ queryKey: HOME_KEY, queryFn: () => api<HomeView>('/api/home') });
