import { useState } from 'react';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import type { BusinessProfile, ProfileView } from '../profile/profile-api';
import { ProfileCopy } from '../profile/profile-copy';
import { EditorActions, EditorScreen, MoreOptions } from '../screens/editor-screen';
import { AreaField, TextField } from '../setup/fields';
import { CommonCopy } from '../setup/setup-copy';
import { ClinicCopy, EditorCopy } from './clinic-copy';
import { urlOk, useProfileEditor } from './use-profile-editor';

type TextKey = 'description' | 'phone' | 'website' | 'social' | 'reviewLink' | 'welcomeMessage';
const EMPTY = '';
const BACK = { to: Route.clinic, label: ClinicCopy.back };

export const BusinessCopy = {
  description: 'O que você faz, em uma ou duas frases',
  descriptionPlaceholder: 'Quiropraxia para dor nas costas e no pescoço.',
  welcome: 'Mensagem de boas-vindas que você já usa',
  welcomePlaceholder: 'Olá! Aqui é do consultório… Qual é o seu nome?',
} as const;

const OPTIONAL: readonly { key: TextKey; label: string; hint?: string; url?: boolean }[] = [
  { key: 'phone', label: ProfileCopy.phone },
  { key: 'social', label: ProfileCopy.social },
  { key: 'website', label: ProfileCopy.website, hint: ProfileCopy.websiteHint, url: true },
  { key: 'reviewLink', label: ProfileCopy.reviewLink, hint: ProfileCopy.websiteHint, url: true },
];

/** Meu consultório › Nome e apresentação: two fields, the contacts under "Mais opções". */
export function BusinessEditor() {
  const { profile, submit, pending } = useProfileEditor();
  return (
    <EditorScreen title={ClinicCopy.business} intro={EditorCopy.businessIntro} back={BACK}>
      {profile.isPending && <ListSkeleton />}
      {profile.isError && (
        <LoadError message={CommonCopy.loadFailed} onRetry={() => void profile.refetch()} />
      )}
      {profile.data && <BusinessForm initial={profile.data} pending={pending} onSave={submit} />}
    </EditorScreen>
  );
}

interface FormProps {
  initial: ProfileView;
  pending: boolean;
  onSave: (view: ProfileView) => void;
}

function BusinessForm({ initial, pending, onSave }: Readonly<FormProps>) {
  const [view, setView] = useState(initial);
  const set = (key: TextKey) => (value: string) => {
    setView({ ...view, profile: { ...view.profile, [key]: value } });
  };
  const linksOk = urlOk(view.profile.website) && urlOk(view.profile.reviewLink);
  return (
    <form
      className="grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(view);
      }}
    >
      <EssentialFields view={view} onChange={setView} />
      <MoreOptions>
        <OptionalFields profile={view.profile} set={set} />
      </MoreOptions>
      {!linksOk && (
        <p role="alert" className="text-sm text-danger">
          {ProfileCopy.invalidUrl}
        </p>
      )}
      <EditorActions
        pending={pending}
        disabled={!linksOk || !view.name.trim()}
        backTo={Route.clinic}
      />
    </form>
  );
}

interface OptionalProps {
  profile: BusinessProfile;
  set: (key: TextKey) => (value: string) => void;
}

function OptionalFields({ profile, set }: Readonly<OptionalProps>) {
  return (
    <>
      {OPTIONAL.map((field) => (
        <TextField
          key={field.key}
          id={`business-${field.key}`}
          label={field.label}
          {...(field.hint ? { hint: field.hint } : {})}
          {...(field.url ? { type: 'url', inputMode: 'url' as const } : {})}
          value={profile[field.key] ?? EMPTY}
          onChange={set(field.key)}
          maxLength={300}
        />
      ))}
      <AreaField
        id="business-welcome"
        label={BusinessCopy.welcome}
        placeholder={BusinessCopy.welcomePlaceholder}
        value={profile.welcomeMessage ?? EMPTY}
        onChange={set('welcomeMessage')}
        maxLength={1000}
      />
    </>
  );
}

function EssentialFields({
  view,
  onChange,
}: Readonly<{ view: ProfileView; onChange: (view: ProfileView) => void }>) {
  return (
    <>
      <TextField
        id="business-name"
        label={ProfileCopy.name}
        value={view.name}
        onChange={(name) => {
          onChange({ ...view, name });
        }}
        required
        maxLength={120}
      />
      <AreaField
        id="business-description"
        label={BusinessCopy.description}
        placeholder={BusinessCopy.descriptionPlaceholder}
        value={view.profile.description ?? EMPTY}
        onChange={(description) => {
          onChange({ ...view, profile: { ...view.profile, description } });
        }}
        maxLength={600}
      />
    </>
  );
}
