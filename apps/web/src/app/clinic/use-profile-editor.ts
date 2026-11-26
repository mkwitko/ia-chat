import { useNavigate } from 'react-router';
import { Route } from '@/routes';
import {
  useProfile,
  useSaveProfile,
  type BusinessProfile,
  type ProfileView,
} from '../profile/profile-api';
import { notifySaved, notifySaveError } from '../setup/feedback';

const EMPTY = '';

/** Empty fields leave the profile instead of reaching the API as "". */
export function cleanProfile(profile: BusinessProfile): BusinessProfile {
  const entries = Object.entries(profile).filter(([, value]) => value !== EMPTY);
  return Object.fromEntries(entries) as unknown as BusinessProfile;
}

const HTTP_URL = /^https?:\/\/\S+$/i;
export const urlOk = (value: string | undefined) => !value || HTTP_URL.test(value);

/** The business profile behind the "Nome" and "Pagamento" editors: save, then back to the summary. */
export function useProfileEditor() {
  const profile = useProfile();
  const save = useSaveProfile();
  const navigate = useNavigate();
  const submit = (view: ProfileView) => {
    save.mutate(
      { ...view, profile: cleanProfile(view.profile) },
      {
        onSuccess: () => {
          notifySaved();
          void navigate(Route.clinic);
        },
        onError: notifySaveError,
      },
    );
  };
  return { profile, submit, pending: save.isPending };
}
