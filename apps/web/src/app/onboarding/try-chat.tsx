import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api';
import { Bubble, Used } from '../simulator/chat';
import {
  SimRole,
  TOO_MANY_REQUESTS,
  useSimulatorTurn,
  type ChatLine,
} from '../simulator/simulator-api';
import { SimulatorCopy } from '../simulator/simulator-copy';
import type { Step } from './onboarding-api';
import { adjustTarget, TryCopy as Copy } from './try-model';

const failureText = (error: Error) =>
  error instanceof ApiError && error.status === TOO_MANY_REQUESTS
    ? SimulatorCopy.tooMany
    : SimulatorCopy.failed;

function useTry() {
  const [lines, setLines] = useState<ChatLine[]>([]);
  const turn = useSimulatorTurn();
  const ask = (text: string) => {
    if (!text.trim() || turn.isPending) return;
    const next: ChatLine[] = [...lines, { role: SimRole.patient, text: text.trim() }];
    setLines(next);
    turn.mutate(
      next.map(({ role, text: said }) => ({ role, text: said })),
      {
        onSuccess: (reply) => {
          setLines([...next, { role: SimRole.assistant, text: reply.text, reply }]);
        },
        onError: (error) => toast.error(failureText(error)),
      },
    );
  };
  return { lines, ask, pending: turn.isPending };
}

/** Step 5 (and "ver conversa de exemplo"): the simulator with the owner's data, three starters. */
export function TryChat({ onGoTo }: Readonly<{ onGoTo: (step: Step) => void }>) {
  const { lines, ask, pending } = useTry();
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">{SimulatorCopy.notice}</p>
      <Starters disabled={pending} onAsk={ask} />
      {lines.length > 0 && (
        <ol aria-label={SimulatorCopy.chatLabel} className="grid gap-3">
          {lines.map((line, index) => (
            <li key={`${line.role}-${String(index)}`} className="grid gap-1">
              <Bubble line={line} />
              {line.reply && <Used reply={line.reply} />}
              {line.reply && <Verdict target={adjustTarget(line.reply)} onGoTo={onGoTo} />}
            </li>
          ))}
        </ol>
      )}
      {pending && (
        <p role="status" className="text-sm text-jade-ink">
          {SimulatorCopy.sending}
        </p>
      )}
      <AskForm pending={pending} onAsk={ask} />
    </div>
  );
}

function AskForm({
  pending,
  onAsk,
}: Readonly<{ pending: boolean; onAsk: (text: string) => void }>) {
  const [draft, setDraft] = useState('');
  return (
    <form
      className="flex gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onAsk(draft);
        setDraft('');
      }}
    >
      <Input
        aria-label={SimulatorCopy.fieldLabel}
        placeholder={Copy.placeholder}
        value={draft}
        maxLength={1000}
        onChange={(event) => {
          setDraft(event.target.value);
        }}
      />
      <Button type="submit" variant="outline" disabled={pending || !draft.trim()}>
        {SimulatorCopy.send}
      </Button>
    </form>
  );
}

function Starters({
  disabled,
  onAsk,
}: Readonly<{ disabled: boolean; onAsk: (text: string) => void }>) {
  return (
    <div className="flex flex-wrap gap-2">
      {Copy.starters.map((question) => (
        <Button
          key={question}
          variant="outline"
          className="rounded-full"
          disabled={disabled}
          onClick={() => {
            onAsk(question);
          }}
        >
          {question}
        </Button>
      ))}
    </div>
  );
}

interface VerdictProps {
  target: ReturnType<typeof adjustTarget>;
  onGoTo: (step: Step) => void;
}

/** Per answer: "Boa" or "Ajustar", which opens where the answer came from (pattern of Fin). */
function Verdict({ target, onGoTo }: Readonly<VerdictProps>) {
  const [good, setGood] = useState(false);
  const navigate = useNavigate();
  const adjust = () => {
    if ('step' in target) onGoTo(target.step);
    else void navigate(target.to);
  };
  return (
    <div className="flex items-center justify-self-end gap-1">
      {good ? (
        <span className="px-2 text-sm text-jade-ink" role="status">
          {Copy.markedGood}
        </span>
      ) : (
        <Button
          variant="ghost"
          onClick={() => {
            setGood(true);
          }}
        >
          {Copy.good}
        </Button>
      )}
      <Button variant="ghost" onClick={adjust}>
        {Copy.adjust(target.label)}
      </Button>
    </div>
  );
}
