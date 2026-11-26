import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CUSTOMERS_KEY, HOME_KEY } from '../customers/customers-api';

// Mirrors apps/api/src/whatsapp/history-review*.ts; the web does not import server code.

export interface StagedContact {
  id: string;
  name: string | null;
  phone: string | null;
  messageCount: number;
  lastMessageAt: string | null;
}

export interface StagedMessage {
  id: string;
  fromOwner: boolean;
  /** Null for media: only a placeholder is shown. */
  text: string | null;
  at: string;
}

export interface ReviewSelection {
  id: string;
  messages: boolean;
}

export interface ReviewResult {
  clients: number;
  messages: number;
}

const BASE = '/api/whatsapp/history-import/review';
const REVIEW_KEY = [BASE];
const WHATSAPP_KEY = ['/api/whatsapp'];
const POST = 'POST';

export const useReviewContacts = (enabled = true) =>
  useQuery({
    queryKey: REVIEW_KEY,
    enabled,
    queryFn: () => api<{ contacts: StagedContact[] }>(BASE).then((data) => data.contacts),
  });

export const useStagedMessages = (id: string, enabled: boolean) =>
  useQuery({
    queryKey: [...REVIEW_KEY, id],
    enabled,
    queryFn: () =>
      api<{ messages: StagedMessage[] }>(`${BASE}/${id}/messages`).then((d) => d.messages),
  });

function useReviewWrite<T, I>(call: (input: I) => Promise<T>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    // Not awaited: the empty list would unmount the screen before its own success handler runs.
    onSuccess: () => {
      for (const queryKey of [REVIEW_KEY, WHATSAPP_KEY, CUSTOMERS_KEY, HOME_KEY])
        void client.invalidateQueries({ queryKey });
    },
  });
}

export const useConfirmReview = () =>
  useReviewWrite((selections: ReviewSelection[]) =>
    api<ReviewResult>(`${BASE}/confirm`, { method: POST, body: { selections } }),
  );

export const useDiscardReview = () =>
  useReviewWrite(() => api(`${BASE}/discard`, { method: POST, body: {} }));
