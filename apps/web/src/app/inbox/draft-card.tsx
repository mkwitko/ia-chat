import { FilePen } from 'lucide-react';
import { useState } from 'react';
import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { DraftAction, useDecideDraft, type PendingDraft } from './inbox-api';
import { DraftCopy as Copy } from './inbox-copy';
import { ensureOnline } from './online';

const CONFLICT = 409;
const EDIT_FIELD = 'draft-edit';
const TITLE_ID = 'draft-title';
const Mode = { view: 'view', edit: 'edit', confirm: 'confirm' } as const;
type Mode = (typeof Mode)[keyof typeof Mode];

type Run = (action: DraftAction, text?: string) => void;
interface Buttons {
  busy: boolean;
  run: Run;
  go: (mode: Mode) => () => void;
}

/** DESIGN.md: draft card in the approval color, three one-tap actions (RF-13). */
export function DraftCard({
  conversationId,
  draft,
}: Readonly<{ conversationId: string; draft: PendingDraft }>) {
  const decide = useDecideDraft(conversationId);
  const [mode, setMode] = useState<Mode>(Mode.view);
  // Local state: the edit survives new messages arriving (spec 10, "Tempo real").
  const [text, setText] = useState(draft.text);
  const run = runner(decide, draft.turnId);
  const buttons: Buttons = {
    busy: decide.isPending,
    run,
    go: (next) => () => {
      setMode(next);
    },
  };
  return (
    <section
      aria-labelledby={TITLE_ID}
      className="mx-3 mb-2 grid gap-2 rounded-xl bg-approval-soft p-3"
    >
      <h2 id={TITLE_ID} className="flex items-center gap-2 text-sm font-semibold text-approval">
        <FilePen className="size-4" aria-hidden="true" />
        {Copy.title}
      </h2>
      {mode === Mode.edit ? (
        <EditField value={text} onChange={setText} />
      ) : (
        <p className="text-base whitespace-pre-wrap">{draft.text}</p>
      )}
      <p className="text-sm text-muted-foreground">{Copy.hint}</p>
      <div className="flex flex-wrap gap-2">
        {mode === Mode.view && <ViewButtons {...buttons} />}
        {mode === Mode.edit && <EditButtons {...buttons} text={text.trim()} />}
        {mode === Mode.confirm && <ConfirmButtons {...buttons} />}
      </div>
    </section>
  );
}

function EditField({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (v: string) => void }>) {
  return (
    <>
      <label htmlFor={EDIT_FIELD} className="sr-only">
        {Copy.editLabel}
      </label>
      <textarea
        id={EDIT_FIELD}
        value={value}
        rows={4}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        className="w-full rounded-lg border border-input bg-card p-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      />
    </>
  );
}

function ViewButtons({ busy, run, go }: Readonly<Buttons>) {
  return (
    <>
      <Button
        disabled={busy}
        onClick={() => {
          run(DraftAction.approve);
        }}
      >
        {Copy.send}
      </Button>
      <Button variant="outline" onClick={go(Mode.edit)}>
        {Copy.edit}
      </Button>
      <Button variant="destructive" onClick={go(Mode.confirm)}>
        {Copy.discard}
      </Button>
    </>
  );
}

function EditButtons({ busy, run, go, text }: Readonly<Buttons & { text: string }>) {
  return (
    <>
      <Button
        disabled={busy || !text}
        onClick={() => {
          run(DraftAction.edit, text);
        }}
      >
        {Copy.sendEdited}
      </Button>
      <Button variant="outline" onClick={go(Mode.view)}>
        {Copy.cancelEdit}
      </Button>
    </>
  );
}

function ConfirmButtons({ busy, run, go }: Readonly<Buttons>) {
  return (
    <>
      <span className="self-center text-sm font-semibold">{Copy.confirmDiscard}</span>
      <Button
        variant="destructive"
        disabled={busy}
        onClick={() => {
          run(DraftAction.discard);
        }}
      >
        {Copy.confirmYes}
      </Button>
      <Button variant="outline" onClick={go(Mode.view)}>
        {Copy.confirmNo}
      </Button>
    </>
  );
}

const failureText = (error: Error) =>
  error instanceof ApiError && error.status === CONFLICT ? Copy.stale : Copy.failed;

/** Offline actions are refused, not queued (spec 10); a stale draft (409) says so. */
function runner(decide: ReturnType<typeof useDecideDraft>, turnId: string): Run {
  return (action, edited) => {
    if (!ensureOnline()) return;
    const body = edited === undefined ? {} : { text: edited };
    decide.mutate(
      { action, turnId, ...body },
      { onError: (error) => notifyError(failureText(error)) },
    );
  };
}
