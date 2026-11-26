import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cleanProfile } from '../profile/profile-form';
import { ProfilePath, type Place, type ProfileView } from '../profile/profile-api';
import { ONBOARDING_KEY } from './onboarding-api';
import { PrefillCopy } from './prefill-copy';
import { servicesToSave, type ReviewDraft } from './prefill-model';

// "Salvar o que conferi": the approved draft goes through the same routes as the settings
// screens (profile, main address, services, weekly hours), each audited on the server.

const Method = { post: 'POST', put: 'PUT' } as const;
const SERVICES = '/api/services';
const AVAILABILITY = '/api/availability';
const TOUCHED = [ProfilePath.profile, ProfilePath.places, ProfilePath.location, SERVICES];

async function saveProfile(draft: ReviewDraft): Promise<void> {
  const current = await api<ProfileView>(ProfilePath.profile);
  const known = new Set(current.profile.packages.map((item) => item.name));
  const packages = [
    ...current.profile.packages,
    ...draft.packages
      .filter((item) => item.keep && !known.has(item.name))
      .map(({ name, priceCents }) => ({ name, priceCents })),
  ];
  const profile = cleanProfile({
    ...current.profile,
    description: draft.description.trim() || current.profile.description,
    phone: draft.phone.trim() || current.profile.phone,
    website: draft.website.trim() || current.profile.website,
    social: draft.social.trim() || current.profile.social,
    packages,
  });
  await api(ProfilePath.profile, {
    method: Method.put,
    body: { ...current, name: draft.name.trim() || current.name, profile },
  });
}

async function saveAddress(address: string): Promise<void> {
  if (!address.trim()) return;
  const { locations } = await api<{ locations: Place[] }>(ProfilePath.places);
  const main = locations[0];
  // The main address keeps its arrival instructions; only the address itself changes.
  await api(ProfilePath.location, {
    method: Method.put,
    body: { address: address.trim(), arrivalInstructions: main?.arrivalInstructions ?? null },
  });
}

async function applyDraft(draft: ReviewDraft): Promise<void> {
  await saveProfile(draft);
  await saveAddress(draft.address);
  for (const body of servicesToSave(draft.services))
    await api(SERVICES, { method: Method.post, body });
  if (draft.keepHours && draft.hours.length > 0)
    await api(AVAILABILITY, { method: Method.put, body: { rules: draft.hours } });
}

export function useApplyPrefill() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: applyDraft,
    onSuccess: () => toast.success(PrefillCopy.saved),
    onSettled: () =>
      Promise.all(
        [...TOUCHED, AVAILABILITY].map((key) => client.invalidateQueries({ queryKey: [key] })),
      ).then(() => client.invalidateQueries({ queryKey: ONBOARDING_KEY })),
  });
}
