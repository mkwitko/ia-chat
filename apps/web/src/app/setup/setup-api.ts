import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/setup/*; the web does not import server code.

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  visibleToPatient: boolean;
}
export type ServiceInput = Omit<Service, 'id'>;
export interface ServicesView {
  pricesForbidden: boolean;
  services: Service[];
}

export interface Location {
  address: string;
  arrivalInstructions: string | null;
}

export interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
}
/** The same question asked more than once, folded into one card. */
export interface Unanswered {
  ids: string[];
  question: string;
  count: number;
  lastAskedAt: string;
}
export interface KnowledgeView {
  items: KnowledgeItem[];
  unanswered: Unanswered[];
}
export interface KnowledgeInput {
  question: string;
  answer: string;
}

export const Formality = { formal: 'formal', informal: 'informal' } as const;
export type Formality = (typeof Formality)[keyof typeof Formality];
export const EmojiUse = { never: 'never', sometimes: 'sometimes', often: 'often' } as const;
export type EmojiUse = (typeof EmojiUse)[keyof typeof EmojiUse];
export interface Tone {
  professionalName: string;
  answers: { formality: Formality; emoji: EmojiUse; greeting: string; farewell: string };
  examples: string[];
}

const Method = { post: 'POST', put: 'PUT', delete: 'DELETE' } as const;
const Path = {
  services: '/api/services',
  location: '/api/location',
  knowledge: '/api/knowledge',
  tone: '/api/tone',
} as const;

export const useServices = () =>
  useQuery({ queryKey: [Path.services], queryFn: () => api<ServicesView>(Path.services) });
export const useLocation = () =>
  useQuery({
    queryKey: [Path.location],
    queryFn: () => api<{ location: Location | null }>(Path.location),
  });
export const useKnowledge = () =>
  useQuery({ queryKey: [Path.knowledge], queryFn: () => api<KnowledgeView>(Path.knowledge) });
export const useTone = () =>
  useQuery({ queryKey: [Path.tone], queryFn: () => api<Tone>(Path.tone) });

/** One mutation per resource; the list it touches is reloaded after. */
function useWrite<T>(base: string, call: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () => client.invalidateQueries({ queryKey: [base] }),
  });
}

export interface WithId<T> {
  id: string;
  body: T;
}

export const useCreateService = () =>
  useWrite(Path.services, (body: ServiceInput) =>
    api(Path.services, { method: Method.post, body }),
  );
export const useUpdateService = () =>
  useWrite(Path.services, ({ id, body }: WithId<ServiceInput>) =>
    api(`${Path.services}/${id}`, { method: Method.put, body }),
  );
export const useArchiveService = () =>
  useWrite(Path.services, (id: string) => api(`${Path.services}/${id}`, { method: Method.delete }));
export const useSaveLocation = () =>
  useWrite(Path.location, (body: Location) => api(Path.location, { method: Method.put, body }));
export const useCreateKnowledge = () =>
  useWrite(Path.knowledge, (body: KnowledgeInput) =>
    api(Path.knowledge, { method: Method.post, body }),
  );
export const useUpdateKnowledge = () =>
  useWrite(Path.knowledge, ({ id, body }: WithId<KnowledgeInput>) =>
    api(`${Path.knowledge}/${id}`, { method: Method.put, body }),
  );
export const useApproveUnanswered = () =>
  useWrite(Path.knowledge, (body: KnowledgeInput & { ids: string[] }) =>
    api(`${Path.knowledge}/unanswered/approve`, { method: Method.post, body }),
  );
export const useDismissUnanswered = () =>
  useWrite(Path.knowledge, (ids: string[]) =>
    api(`${Path.knowledge}/unanswered/dismiss`, { method: Method.post, body: { ids } }),
  );
export const useSuggestAnswer = () =>
  useMutation({
    mutationFn: (question: string) =>
      api<{ suggestion: string }>(`${Path.knowledge}/unanswered/suggest`, {
        method: Method.post,
        body: { question },
      }),
  });
export const useArchiveKnowledge = () =>
  useWrite(Path.knowledge, (id: string) =>
    api(`${Path.knowledge}/${id}`, { method: Method.delete }),
  );
export const useSaveTone = () =>
  useWrite(Path.tone, (body: Tone) => api(Path.tone, { method: Method.put, body }));
