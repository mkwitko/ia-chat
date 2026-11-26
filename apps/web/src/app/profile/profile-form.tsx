import { useState } from 'react';
import { feedback } from '../setup/feedback';
import { AreaField, FormActions, TextField } from '../setup/fields';
import { PaymentSection } from './payment-section';
import { useProfile, useSaveProfile, type BusinessProfile, type ProfileView } from './profile-api';
import { ProfileCopy as Copy } from './profile-copy';

type TextKey = 'description' | 'phone' | 'website' | 'social' | 'reviewLink';
const HTTP_URL = /^https?:\/\/\S+$/i;
const EMPTY = '';

/** Empty fields leave the profile instead of reaching the API as "". */
export function cleanProfile(profile: BusinessProfile): BusinessProfile {
  const entries = Object.entries(profile).filter(([, value]) => value !== EMPTY);
  return Object.fromEntries(entries) as unknown as BusinessProfile;
}

const urlOk = (value: string | undefined) => !value || HTTP_URL.test(value);

/** M-04: the business fields, payment methods and cancellation rule, saved together. */
export function ProfileForm({ initial }: Readonly<{ initial: ProfileView }>) {
  const [view, setView] = useState(initial);
  const save = useSaveProfile();
  // Packages and the welcome message have their own sections: keep what they saved.
  const latest = useProfile().data?.profile ?? view.profile;
  const linksOk = urlOk(view.profile.website) && urlOk(view.profile.reviewLink);
  const submit = () => {
    const { packages, welcomeMessage } = latest;
    const profile = cleanProfile({ ...view.profile, packages, welcomeMessage });
    save.mutate({ ...view, profile }, feedback);
  };
  return (
    <form
      className="grid gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <BusinessFields view={view} onChange={setView} />
      <PaymentSection view={view} onChange={setView} />
      {!linksOk && (
        <p role="alert" className="text-sm text-danger">
          {Copy.invalidUrl}
        </p>
      )}
      <FormActions pending={save.isPending} disabled={!linksOk || !view.name.trim()} />
    </form>
  );
}

const CONTACTS: readonly { key: TextKey; label: string; hint?: string; url?: boolean }[] = [
  { key: 'phone', label: Copy.phone },
  { key: 'website', label: Copy.website, hint: Copy.websiteHint, url: true },
  { key: 'social', label: Copy.social },
  { key: 'reviewLink', label: Copy.reviewLink, hint: Copy.reviewLinkHint, url: true },
];

interface FieldsProps {
  view: ProfileView;
  onChange: (view: ProfileView) => void;
}

function BusinessFields({ view, onChange }: Readonly<FieldsProps>) {
  const set = (key: TextKey) => (value: string) => {
    onChange({ ...view, profile: { ...view.profile, [key]: value } });
  };
  return (
    <section className="grid gap-4" aria-labelledby="profile-business">
      <h2 id="profile-business" className="text-lg">
        {Copy.businessHeading}
      </h2>
      <TextField
        id="profile-name"
        label={Copy.name}
        value={view.name}
        onChange={(name) => {
          onChange({ ...view, name });
        }}
        required
        maxLength={120}
      />
      <AreaField
        id="profile-description"
        label={Copy.description}
        hint={Copy.descriptionHint}
        value={view.profile.description ?? EMPTY}
        onChange={set('description')}
        maxLength={600}
      />
      <ContactFields view={view} set={set} />
    </section>
  );
}

function ContactFields({
  view,
  set,
}: Readonly<{ view: ProfileView; set: (key: TextKey) => (value: string) => void }>) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {CONTACTS.map((field) => (
        <TextField
          key={field.key}
          id={`profile-${field.key}`}
          label={field.label}
          {...(field.hint ? { hint: field.hint } : {})}
          {...(field.url ? { type: 'url', inputMode: 'url' as const } : {})}
          value={view.profile[field.key] ?? EMPTY}
          onChange={set(field.key)}
          maxLength={300}
        />
      ))}
    </div>
  );
}
