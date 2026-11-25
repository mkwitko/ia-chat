import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadingCopy } from '@/copy';
import { ApiError } from '@/lib/api';
import { Route } from '@/routes';
import { BackLink } from '../screens/back-link';
import { Screen, ScreenWidth } from '../screens/screen';
import { AssistantCopy as Copy, DEFAULT_ASSISTANT_NAME, introPreview } from './assistant-copy';
import { ChoiceList } from './choice-list';
import {
  IdentityMode,
  useAssistantSettings,
  useSaveAssistantSettings,
  type AssistantSettings,
  type AssistantSettingsView,
} from './settings-api';

const FORBIDDEN = 403;
const NAME_FIELD = 'assistant-name';
const NAME_MAX = 40; // same limit as the API

/** Spec 10, "Mais > Assistente": autonomy, identity and name. */
export function AssistantScreen() {
  const settings = useAssistantSettings();
  return (
    <Screen title={Copy.title} width={ScreenWidth.form}>
      <BackLink to={Route.more} label={Copy.back} />
      <nav
        aria-label={Copy.sectionsLabel}
        className="mx-4 mb-6 divide-y rounded-xl border bg-card md:mx-0"
      >
        {Copy.sections.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            className="flex min-h-14 items-center gap-3 px-4 hover:bg-muted"
          >
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{section.label}</span>
              <span className="block truncate text-sm text-muted-foreground">{section.hint}</span>
            </span>
            <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
          </Link>
        ))}
      </nav>
      {settings.isPending && (
        <p className="px-4 py-6 text-muted-foreground md:px-0">{LoadingCopy}</p>
      )}
      {settings.isError && (
        <div role="alert" className="grid justify-items-start gap-3 px-4 py-6 md:px-0">
          <p>{Copy.loadFailed}</p>
          <Button variant="outline" onClick={() => void settings.refetch()}>
            {Copy.retry}
          </Button>
        </div>
      )}
      {settings.data && <AssistantForm initial={settings.data} />}
    </Screen>
  );
}

function AssistantForm({ initial }: Readonly<{ initial: AssistantSettingsView }>) {
  // Only the editable fields: the API refuses anything else.
  const { autonomy, identityMode, assistantName } = initial;
  const [draft, setDraft] = useState<AssistantSettings>({ autonomy, identityMode, assistantName });
  const save = useSaveAssistantSettings();
  const update = (change: Partial<AssistantSettings>) => {
    setDraft({ ...draft, ...change });
  };
  return (
    <form
      className="grid gap-8 pt-2 pb-8"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(
          { ...draft, assistantName: nameOf(draft) },
          { onSuccess: () => toast.success(Copy.saved), onError: showSaveError },
        );
      }}
    >
      <ChoiceList
        name="autonomy"
        legend={Copy.autonomyLegend}
        choices={Copy.autonomy}
        value={draft.autonomy}
        onChange={(autonomy) => {
          update({ autonomy });
        }}
      />
      <IdentityFields draft={draft} professional={initial.professionalName} onChange={update} />
      <div className="px-4 md:px-0">
        <Button type="submit" disabled={save.isPending} className="w-full md:w-auto">
          {save.isPending ? Copy.saving : Copy.save}
        </Button>
      </div>
    </form>
  );
}

const nameOf = (draft: AssistantSettings) => draft.assistantName.trim() || DEFAULT_ASSISTANT_NAME;

function showSaveError(error: Error) {
  const forbidden = error instanceof ApiError && error.status === FORBIDDEN;
  toast.error(forbidden ? Copy.forbidden : Copy.saveFailed);
}

interface IdentityFieldsProps {
  draft: AssistantSettings;
  professional: string;
  onChange: (change: Partial<AssistantSettings>) => void;
}

function IdentityFields({ draft, professional, onChange }: Readonly<IdentityFieldsProps>) {
  const intro = introPreview(draft.identityMode, nameOf(draft), professional);
  const choices = Copy.identity.map((choice) => ({
    ...choice,
    detail: <IdentityDetail intro={intro} risky={choice.value === IdentityMode.professional} />,
  }));
  return (
    <div className="grid gap-4">
      <ChoiceList
        name="identity"
        legend={Copy.identityLegend}
        choices={choices}
        value={draft.identityMode}
        onChange={(identityMode) => {
          onChange({ identityMode });
        }}
      />
      {draft.identityMode === IdentityMode.assistant && (
        <NameField
          value={draft.assistantName}
          onChange={(assistantName) => {
            onChange({ assistantName });
          }}
        />
      )}
      <p className="px-4 text-sm text-muted-foreground md:px-0">{Copy.truthNote}</p>
    </div>
  );
}

function IdentityDetail({ intro, risky }: Readonly<{ intro: string; risky: boolean }>) {
  return (
    <span className="mt-2 grid gap-2 text-sm">
      <span className="text-muted-foreground">{Copy.previewLabel}</span>
      <span className="rounded-lg bg-card px-3 py-2">{intro}</span>
      {risky && (
        <span className="rounded-lg bg-attention-soft px-3 py-2">{Copy.professionalRisk}</span>
      )}
    </span>
  );
}

function NameField({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (v: string) => void }>) {
  return (
    <div className="grid gap-2 px-4 md:px-0">
      <Label htmlFor={NAME_FIELD}>{Copy.nameLabel}</Label>
      <Input
        id={NAME_FIELD}
        maxLength={NAME_MAX}
        value={value === DEFAULT_ASSISTANT_NAME ? '' : value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      />
      <p className="text-sm text-muted-foreground">{Copy.nameHint}</p>
    </div>
  );
}
