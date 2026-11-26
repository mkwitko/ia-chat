import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { AreaField, FormActions } from './fields';
import { feedback } from './feedback';
import {
  useApproveUnanswered,
  useDismissUnanswered,
  useSuggestAnswer,
  type Unanswered,
} from './setup-api';
import { KnowledgeCopy as Copy } from './setup-copy';

const MAX_ANSWER = 2000;
const SINGLE = 1;

/** Spec 10: "um toque para escrever a resposta e incluí-la na base". Similar questions come folded. */
export function UnansweredList({ items }: Readonly<{ items: Unanswered[] }>) {
  if (items.length === 0) return null;
  return (
    <section className="grid gap-3">
      <h2 className="text-lg">{Copy.unansweredHeading}</h2>
      <p className="text-sm text-muted-foreground">{Copy.unansweredHint}</p>
      {items.map((item) => (
        <UnansweredCard key={item.ids.join()} item={item} />
      ))}
    </section>
  );
}

function useDraft(question: string, onDraft: (text: string) => void) {
  const suggest = useSuggestAnswer();
  const run = () => {
    suggest.mutate(question, {
      onSuccess: ({ suggestion }) => {
        onDraft(suggestion);
      },
      onError: () => toast.error(Copy.suggestFailed),
    });
  };
  return { run, pending: suggest.isPending, done: suggest.isSuccess };
}

function UnansweredCard({ item }: Readonly<{ item: Unanswered }>) {
  const [answer, setAnswer] = useState('');
  const approve = useApproveUnanswered();
  const dismiss = useDismissUnanswered();
  const draft = useDraft(item.question, setAnswer);
  return (
    <form
      className="grid gap-3 rounded-xl border border-attention/40 bg-attention-soft p-4"
      onSubmit={(event) => {
        event.preventDefault();
        approve.mutate({ ids: item.ids, question: item.question, answer }, feedback);
      }}
    >
      <div className="grid gap-1">
        <p className="font-semibold">{item.question}</p>
        {item.count > SINGLE && (
          <p className="text-sm text-muted-foreground">{Copy.asked(item.count)}</p>
        )}
      </div>
      <AreaField
        id={`answer-${item.ids[0] ?? ''}`}
        label={Copy.answerLabel(item.question)}
        value={answer}
        onChange={setAnswer}
        required
        maxLength={MAX_ANSWER}
        className="bg-card"
        placeholder={Copy.answerPlaceholder}
        {...(draft.done ? { hint: Copy.suggestHint } : {})}
      />
      <CardActions
        pending={approve.isPending}
        draft={draft}
        onDismiss={() => {
          if (window.confirm(Copy.dismissConfirm)) dismiss.mutate(item.ids, feedback);
        }}
      />
    </form>
  );
}

interface CardActionsProps {
  pending: boolean;
  draft: ReturnType<typeof useDraft>;
  onDismiss: () => void;
}

function CardActions({ pending, draft, onDismiss }: Readonly<CardActionsProps>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <FormActions
        pending={pending}
        saveLabel={Copy.saveAnswer}
        cancelLabel={Copy.ignore}
        onCancel={onDismiss}
      />
      <Button type="button" variant="outline" disabled={draft.pending} onClick={draft.run}>
        {draft.pending ? Copy.suggesting : Copy.suggest}
      </Button>
    </div>
  );
}
