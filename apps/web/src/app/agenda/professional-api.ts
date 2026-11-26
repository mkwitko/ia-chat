import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/setup/professional-services-routes.ts: the services a professional
// performs. An empty list means every service (H-45).

const PUT = 'PUT';
const servicesPath = (id: string) => `/api/professionals/${id}/services`;

/** `?profissional=` in the Agenda and in Horários: whose agenda is on screen. */
export const PROFESSIONAL_PARAM = 'profissional';

export const useProfessionalServices = (id: string) =>
  useQuery({
    queryKey: [servicesPath(id)],
    queryFn: () => api<{ serviceIds: string[] }>(servicesPath(id)),
  });

export function useSaveProfessionalServices(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (serviceIds: string[]) =>
      api(servicesPath(id), { method: PUT, body: { serviceIds } }),
    onSuccess: () => client.invalidateQueries({ queryKey: [servicesPath(id)] }),
  });
}

const INITIALS = 2;

/** "Ana Souza" → "AS": the mark that tells professionals apart without relying on color. */
export function initialsOf(name: string): string {
  // Letters only: "Revisão UI (fictício)" gives "RF", not "R(".
  const words = name.match(/\p{L}+/gu) ?? [];
  const picked = words.length > 1 ? [words[0], words.at(-1)] : words;
  return picked
    .map((word) => word?.charAt(0) ?? '')
    .join('')
    .slice(0, INITIALS)
    .toUpperCase();
}
