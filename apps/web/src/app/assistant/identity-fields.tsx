import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AssistantCopy as Copy, DEFAULT_ASSISTANT_NAME, introPreview } from './assistant-copy';
import { ChoiceList } from './choice-list';
import { IdentityMode, type AssistantSettings } from './settings-api';

const NAME_FIELD = 'assistant-name';
const NAME_MAX = 40; // same limit as the API

const nameOf = (draft: AssistantSettings) => draft.assistantName.trim() || DEFAULT_ASSISTANT_NAME;

interface IdentityFieldsProps {
  draft: AssistantSettings;
  professional: string;
  onChange: (change: Partial<AssistantSettings>) => void;
}

/** Spec 01, identity modes: how the assistant introduces itself, with a preview of the message. */
export function IdentityFields({ draft, professional, onChange }: Readonly<IdentityFieldsProps>) {
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
      <p className="text-sm text-muted-foreground">{Copy.truthNote}</p>
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
    <div className="grid gap-2">
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
