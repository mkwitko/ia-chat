import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/setup/{profile,places,professionals}-routes.ts and @app/core
// business-profile (the web does not import packages).

export const PaymentMethod = {
  pix: 'pix',
  credit: 'credit_card',
  debit: 'debit_card',
  cash: 'cash',
  transfer: 'bank_transfer',
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export interface BusinessPackage {
  name: string;
  priceCents: number;
}

export interface BusinessProfile {
  description?: string | undefined;
  phone?: string | undefined;
  website?: string | undefined;
  social?: string | undefined;
  reviewLink?: string | undefined;
  paymentMethods: PaymentMethod[];
  cancellationPolicy?: string | undefined;
  welcomeMessage?: string | undefined;
  packages: BusinessPackage[];
}

export interface ProfileView {
  name: string;
  cancelNoticeMinutes: number;
  profile: BusinessProfile;
}

export interface Place {
  id: string;
  name: string;
  address: string;
  arrivalInstructions: string | null;
}
export type PlaceInput = Omit<Place, 'id'>;

export interface Professional {
  id: string;
  name: string;
}

/** Error code of a removal refused because the row is in use (409). */
export const IN_USE = 'in_use';

const Method = { post: 'POST', put: 'PUT', delete: 'DELETE' } as const;
export const ProfilePath = {
  profile: '/api/profile',
  places: '/api/locations',
  professionals: '/api/professionals',
  // The main address screen reads this one; it is the first place.
  location: '/api/location',
} as const;

export const useProfile = () =>
  useQuery({
    queryKey: [ProfilePath.profile],
    queryFn: () => api<ProfileView>(ProfilePath.profile),
  });
export const usePlaces = () =>
  useQuery({
    queryKey: [ProfilePath.places],
    queryFn: () => api<{ locations: Place[] }>(ProfilePath.places),
  });
export const useProfessionals = () =>
  useQuery({
    queryKey: [ProfilePath.professionals],
    queryFn: () => api<{ professionals: Professional[] }>(ProfilePath.professionals),
  });

function useWrite<T>(keys: readonly string[], call: (input: T) => Promise<unknown>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: call,
    onSuccess: () => Promise.all(keys.map((key) => client.invalidateQueries({ queryKey: [key] }))),
  });
}

export const useSaveProfile = () =>
  useWrite([ProfilePath.profile], (body: ProfileView) =>
    api<ProfileView>(ProfilePath.profile, { method: Method.put, body }),
  );

/** Saves part of the profile over the current one (packages, welcome message...). */
export function useProfilePatch() {
  const profile = useProfile();
  const save = useSaveProfile();
  const patch = (change: Partial<BusinessProfile>, options?: Parameters<typeof save.mutate>[1]) => {
    if (!profile.data) return;
    save.mutate({ ...profile.data, profile: { ...profile.data.profile, ...change } }, options);
  };
  return { profile, patch, pending: save.isPending };
}

const PLACE_KEYS = [ProfilePath.places, ProfilePath.location] as const;
export const useCreatePlace = () =>
  useWrite(PLACE_KEYS, (body: PlaceInput) =>
    api(ProfilePath.places, { method: Method.post, body }),
  );
export const useUpdatePlace = () =>
  useWrite(PLACE_KEYS, ({ id, body }: { id: string; body: PlaceInput }) =>
    api(`${ProfilePath.places}/${id}`, { method: Method.put, body }),
  );
export const useRemovePlace = () =>
  useWrite(PLACE_KEYS, (id: string) =>
    api(`${ProfilePath.places}/${id}`, { method: Method.delete }),
  );

const TEAM_KEYS = [ProfilePath.professionals] as const;
export const useAddProfessional = () =>
  useWrite(TEAM_KEYS, (name: string) =>
    api(ProfilePath.professionals, { method: Method.post, body: { name } }),
  );
export const useRenameProfessional = () =>
  useWrite(TEAM_KEYS, ({ id, name }: { id: string; name: string }) =>
    api(`${ProfilePath.professionals}/${id}`, { method: Method.put, body: { name } }),
  );
export const useRemoveProfessional = () =>
  useWrite(TEAM_KEYS, (id: string) =>
    api(`${ProfilePath.professionals}/${id}`, { method: Method.delete }),
  );
