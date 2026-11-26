import { Link } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { Route } from '@/routes';
import { HistoryCopy as Copy } from './history-copy';
import { useReviewContacts } from './review-api';
import { ReviewCopy } from './review-copy';
import {
  HistoryState,
  useDecideHistory,
  useSuggestFromHistory,
  type HistoryImport as History,
} from './whatsapp-api';

const UNAVAILABLE = 503;

const when = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

/** Spec 03 "Histórico da coexistência": the owner authorizes what comes over, and what does not. */
export function HistoryImport({ history }: Readonly<{ history: History }>) {
  switch (history.state) {
    case HistoryState.offered:
      return <Authorization expiresAt={history.expiresAt} />;
    case HistoryState.expired:
      return <Note text={Copy.closed} />;
    case HistoryState.requested:
      return <Note text={Copy.requested(history.progress)} live />;
    case HistoryState.unavailable:
      return <Note text={Copy.unavailable} />;
    case HistoryState.done:
      return (
        <>
          <ReviewLink />
          <Note text={Copy.done} />
          <Suggest />
        </>
      );
    case HistoryState.none:
    case HistoryState.declined:
      return null;
    default: {
      const unreachable: never = history.state;
      return unreachable;
    }
  }
}

function Note({ text, live = false }: Readonly<{ text: string; live?: boolean }>) {
  return (
    <p role={live ? 'status' : undefined} className="text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function Authorization({ expiresAt }: Readonly<{ expiresAt: string | null }>) {
  const decide = useDecideHistory();
  const answer = (authorize: boolean) => {
    decide.mutate(authorize, { onError: () => toast.error(Copy.failed) });
  };
  return (
    <section aria-labelledby="history-title" className="grid gap-3 rounded-lg border bg-card p-4">
      <h3 id="history-title" className="text-base">
        {Copy.title}
      </h3>
      <p className="text-sm text-muted-foreground">{Copy.intro}</p>
      <List title={Copy.imports} items={Copy.importsList} />
      <List title={Copy.discards} items={Copy.discardsList} />
      <p className="text-sm">{Copy.phoneStep}</p>
      {expiresAt && (
        <p className="text-sm text-muted-foreground">{Copy.deadline(when(expiresAt))}</p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={decide.isPending}
          onClick={() => {
            answer(true);
          }}
        >
          {decide.isPending ? Copy.working : Copy.authorize}
        </Button>
        <Button
          variant="outline"
          disabled={decide.isPending}
          onClick={() => {
            answer(false);
          }}
        >
          {Copy.later}
        </Button>
      </div>
    </section>
  );
}

function List({ title, items }: Readonly<{ title: string; items: readonly string[] }>) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** "IA sugere", behind an explicit click: frequent questions go to the assistant's pending list. */
function Suggest() {
  const suggest = useSuggestFromHistory();
  return (
    <div className="grid justify-items-start gap-2">
      <p className="text-sm font-semibold">{Copy.suggestTitle}</p>
      <p className="text-sm text-muted-foreground">{Copy.suggestWhy}</p>
      <Button
        variant="outline"
        disabled={suggest.isPending}
        onClick={() => {
          suggest.mutate(undefined, {
            onSuccess: ({ added }) => {
              toast(added === 0 ? Copy.suggestedNone : Copy.suggested(added));
            },
            onError: (error) => {
              toast.error(
                error instanceof ApiError && error.status === UNAVAILABLE
                  ? Copy.suggestOff
                  : Copy.failed,
              );
            },
          });
        }}
      >
        {suggest.isPending ? Copy.suggesting : Copy.suggest}
      </Button>
    </div>
  );
}

/** The staged history waits for the owner's choice: nothing is in Clientes until then. */
function ReviewLink() {
  const count = useReviewContacts().data?.length ?? 0;
  if (count === 0) return null;
  return (
    <div className="grid justify-items-start gap-2 rounded-lg border bg-card p-4">
      <p className="text-sm text-muted-foreground">{ReviewCopy.openHint}</p>
      <Button asChild>
        <Link to={Route.importReview}>{ReviewCopy.open(count)}</Link>
      </Button>
    </div>
  );
}
