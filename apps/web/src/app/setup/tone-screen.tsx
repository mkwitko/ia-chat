import { useState } from 'react';
import { Route } from '@/routes';
import { ChoiceList } from '../assistant/choice-list';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen, ScreenWidth } from '../screens/screen';
import { AreaField, FormActions, TextField } from './fields';
import { feedback } from './feedback';
import { useSaveTone, useTone, type Tone } from './setup-api';
import { CommonCopy, ToneCopy as Copy } from './setup-copy';

const MAX_EXAMPLES = 15;
const LINE = /\r?\n/;
const NEWLINE = '\n';

/** Spec 04, "Tom de voz": four questions and real messages. */
export function ToneScreen() {
  const tone = useTone();
  return (
    <Screen title={Copy.title} width={ScreenWidth.form}>
      <BackLink to={Route.assistant} label={CommonCopy.assistant} />
      {tone.isPending && <ListSkeleton />}
      {tone.isError && (
        <LoadError message={CommonCopy.loadFailed} onRetry={() => void tone.refetch()} />
      )}
      {tone.data && <ToneForm initial={tone.data} />}
    </Screen>
  );
}

const examplesOf = (text: string) =>
  text
    .split(LINE)
    .map((line) => line.trim())
    .filter(Boolean);

function ToneForm({ initial }: Readonly<{ initial: Tone }>) {
  const [draft, setDraft] = useState(initial);
  const [examples, setExamples] = useState(initial.examples.join(NEWLINE));
  const save = useSaveTone();
  const submit = () => {
    save.mutate({ ...draft, examples: examplesOf(examples).slice(0, MAX_EXAMPLES) }, feedback);
  };
  return (
    <form
      className="grid gap-8 pt-2 pb-10"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <p className="px-4 text-muted-foreground md:px-0">{Copy.intro}</p>
      <NameField
        value={draft.professionalName}
        onChange={(professionalName) => {
          setDraft({ ...draft, professionalName });
        }}
      />
      <ToneAnswers
        answers={draft.answers}
        onChange={(answers) => {
          setDraft({ ...draft, answers });
        }}
      />
      <ExamplesField value={examples} onChange={setExamples} />
      <div className="px-4 md:px-0">
        <FormActions pending={save.isPending} />
      </div>
    </form>
  );
}

type Answers = Tone['answers'];
interface AnswersProps {
  answers: Answers;
  onChange: (answers: Answers) => void;
}

function ToneChoices({ answers, onChange }: Readonly<AnswersProps>) {
  return (
    <>
      <ChoiceList
        name="formality"
        legend={Copy.formalityLegend}
        choices={Copy.formality}
        value={answers.formality}
        onChange={(formality) => {
          onChange({ ...answers, formality });
        }}
      />
      <ChoiceList
        name="emoji"
        legend={Copy.emojiLegend}
        choices={Copy.emoji}
        value={answers.emoji}
        onChange={(emoji) => {
          onChange({ ...answers, emoji });
        }}
      />
    </>
  );
}

function ToneGreetings({ answers, onChange }: Readonly<AnswersProps>) {
  return (
    <div className="grid gap-4 px-4 md:px-0">
      <TextField
        id="tone-greeting"
        label={Copy.greeting}
        value={answers.greeting}
        onChange={(greeting) => {
          onChange({ ...answers, greeting });
        }}
        maxLength={120}
        placeholder={Copy.greetingPlaceholder}
      />
      <TextField
        id="tone-farewell"
        label={Copy.farewell}
        value={answers.farewell}
        onChange={(farewell) => {
          onChange({ ...answers, farewell });
        }}
        maxLength={120}
        placeholder={Copy.farewellPlaceholder}
      />
    </div>
  );
}

function ExamplesField({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (value: string) => void }>) {
  return (
    <div className="grid gap-2 px-4 md:px-0">
      <AreaField
        id="tone-examples"
        label={Copy.examples}
        value={value}
        onChange={onChange}
        className="min-h-48"
        hint={Copy.examplesHint}
      />
      <p className="text-sm tabular-nums" aria-live="polite">
        {Copy.examplesCount(examplesOf(value).length)}
      </p>
    </div>
  );
}

function ToneAnswers(props: Readonly<AnswersProps>) {
  return (
    <>
      <ToneChoices {...props} />
      <ToneGreetings {...props} />
    </>
  );
}

function NameField({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (value: string) => void }>) {
  return (
    <div className="px-4 md:px-0">
      <TextField
        id="tone-name"
        label={Copy.name}
        value={value}
        onChange={onChange}
        required
        maxLength={80}
        placeholder={Copy.namePlaceholder}
      />
    </div>
  );
}
