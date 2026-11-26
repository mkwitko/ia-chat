import { useState } from 'react';
import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { Route } from '@/routes';
import { EditorScreen } from '../screens/editor-screen';
import { AreaField } from '../setup/fields';
import { CommonCopy } from '../setup/setup-copy';
import { Chat } from './chat';
import {
  SimRole,
  TOO_MANY_REQUESTS,
  useSimulatorTurn,
  type ChatLine,
  type SimulatedMessage,
} from './simulator-api';
import { SimulatorCopy as Copy } from './simulator-copy';

const UNAVAILABLE = 503;
const MAX_MESSAGE = 1_000; // same limit as the API
const ASK_FIELD = 'simulator-message';

const failureText = (error: Error) => {
  if (!(error instanceof ApiError)) return Copy.failed;
  if (error.status === TOO_MANY_REQUESTS) return Copy.tooMany;
  return error.status === UNAVAILABLE ? Copy.off : Copy.failed;
};

const plainOf = ({ role, text }: ChatLine): SimulatedMessage => ({ role, text });

/** Spec 10, "Simulador": nothing is stored (the chat lives in this screen) and nothing is sent. */
export function SimulatorScreen() {
  const chat = useSimulation();
  return (
    <EditorScreen title={Copy.title} back={{ to: Route.assistant, label: CommonCopy.assistant }}>
      <Notes />
      <Chat lines={chat.lines} />
      <Composer chat={chat} />
    </EditorScreen>
  );
}

function useSimulation() {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState('');
  const turn = useSimulatorTurn();
  const send = () => {
    const text = draft.trim();
    if (!text || turn.isPending) return;
    const next: ChatLine[] = [...lines, { role: SimRole.patient, text }];
    setLines(next);
    setDraft('');
    turn.mutate(next.map(plainOf), {
      onSuccess: (reply) => {
        setLines([...next, { role: SimRole.assistant, text: reply.text, reply }]);
      },
      onError: (error) => notifyError(failureText(error)),
    });
  };
  const reset = () => {
    turn.reset();
    setLines([]);
    setDraft('');
  };
  return { lines, draft, setDraft, send, reset, pending: turn.isPending };
}

function Composer({ chat }: Readonly<{ chat: ReturnType<typeof useSimulation> }>) {
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        chat.send();
      }}
    >
      <AreaField
        id={ASK_FIELD}
        label={Copy.fieldLabel}
        value={chat.draft}
        onChange={chat.setDraft}
        maxLength={MAX_MESSAGE}
        placeholder={Copy.placeholder}
      />
      <div className="flex gap-2">
        <Button type="submit" disabled={chat.pending || !chat.draft.trim()}>
          {chat.pending ? Copy.sending : Copy.send}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={chat.reset}
          disabled={chat.lines.length === 0}
        >
          {Copy.reset}
        </Button>
      </div>
    </form>
  );
}

function Notes() {
  return (
    <div className="grid gap-2 px-4 text-sm md:px-0">
      <p className="text-muted-foreground">{Copy.intro}</p>
      <p role="note" className="rounded-lg bg-muted px-3 py-2 font-medium">
        {Copy.notice}
      </p>
      <p className="text-muted-foreground">{Copy.limits}</p>
    </div>
  );
}
