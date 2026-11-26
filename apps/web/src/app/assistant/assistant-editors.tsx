import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';
import { ApiError } from '@/lib/api';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EditorActions, EditorScreen } from '../screens/editor-screen';
import { AssistantCopy as Copy, DEFAULT_ASSISTANT_NAME } from './assistant-copy';
import { AssistantSummaryCopy } from './assistant-model';
import { ChoiceList } from './choice-list';
import { IdentityFields } from './identity-fields';
import {
  useAssistantSettings,
  useSaveAssistantSettings,
  type AssistantSettings,
  type AssistantSettingsView,
} from './settings-api';

const FORBIDDEN = 403;
const BACK = { to: Route.assistant, label: AssistantSummaryCopy.title };

export const EditorIntro = {
  autonomy: 'Você pode mudar quando quiser.',
  identity: 'O que o paciente lê na primeira mensagem.',
} as const;

const nameOf = (draft: AssistantSettings) => draft.assistantName.trim() || DEFAULT_ASSISTANT_NAME;

function showSaveError(error: Error) {
  const forbidden = error instanceof ApiError && error.status === FORBIDDEN;
  notifyError(forbidden ? Copy.forbidden : Copy.saveFailed);
}

type Fields = (props: {
  draft: AssistantSettings;
  view: AssistantSettingsView;
  onChange: (change: Partial<AssistantSettings>) => void;
}) => ReactNode;

/** One assistant setting per editor; both save the same record and return to the summary. */
function SettingsEditor({
  title,
  intro,
  fields,
}: Readonly<{ title: string; intro: string; fields: Fields }>) {
  const settings = useAssistantSettings();
  return (
    <EditorScreen title={title} intro={intro} back={BACK}>
      {settings.isPending && <ListSkeleton />}
      {settings.isError && (
        <LoadError message={Copy.loadFailed} onRetry={() => void settings.refetch()} />
      )}
      {settings.data && <SettingsForm view={settings.data} fields={fields} />}
    </EditorScreen>
  );
}

function SettingsForm({
  view,
  fields: Fields,
}: Readonly<{ view: AssistantSettingsView; fields: Fields }>) {
  // Only the editable fields: the API refuses anything else.
  const { autonomy, identityMode, assistantName } = view;
  const [draft, setDraft] = useState<AssistantSettings>({ autonomy, identityMode, assistantName });
  const save = useSaveAssistantSettings();
  const navigate = useNavigate();
  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(
          { ...draft, assistantName: nameOf(draft) },
          {
            onSuccess: () => {
              toast.success(Copy.saved);
              void navigate(Route.assistant);
            },
            onError: showSaveError,
          },
        );
      }}
    >
      <Fields
        draft={draft}
        view={view}
        onChange={(change) => {
          setDraft({ ...draft, ...change });
        }}
      />
      <EditorActions pending={save.isPending} backTo={Route.assistant} />
    </form>
  );
}

const AutonomyFields: Fields = ({ draft, onChange }) => (
  <ChoiceList
    name="autonomy"
    legend={Copy.autonomyLegend}
    choices={Copy.autonomy}
    value={draft.autonomy}
    onChange={(autonomy) => {
      onChange({ autonomy });
    }}
  />
);

const IdentityEditorFields: Fields = ({ draft, view, onChange }) => (
  <IdentityFields draft={draft} professional={view.professionalName} onChange={onChange} />
);

export function AutonomyEditor() {
  return (
    <SettingsEditor
      title={AssistantSummaryCopy.autonomy}
      intro={EditorIntro.autonomy}
      fields={AutonomyFields}
    />
  );
}

export function IdentityEditor() {
  return (
    <SettingsEditor
      title={AssistantSummaryCopy.identity}
      intro={EditorIntro.identity}
      fields={IdentityEditorFields}
    />
  );
}
