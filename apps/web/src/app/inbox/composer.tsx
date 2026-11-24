import { SendHorizontal } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSendMessage } from './inbox-api';
import { ConversationCopy as Copy } from './inbox-copy';
import { ensureOnline } from './online';

const FIELD = 'composer';
const MAX_LENGTH = 4096; // same limit as the API

/** Spec 10: reply from the panel; sending also takes the conversation over. */
export function Composer({ conversationId }: Readonly<{ conversationId: string }>) {
  const send = useSendMessage(conversationId);
  // Local state: a typed reply survives new messages arriving (spec 10, "Tempo real").
  const [text, setText] = useState('');
  const submit = () => {
    const value = text.trim();
    if (!value || !ensureOnline()) return;
    send.mutate(value, {
      onSuccess: () => {
        setText('');
      },
      onError: () => toast.error(Copy.sendFailed),
    });
  };
  return (
    <form
      className="grid gap-1 border-t bg-card px-3 pt-2 pb-3"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label htmlFor={FIELD} className="sr-only">
        {Copy.composerLabel}
      </label>
      <div className="flex items-end gap-2">
        <ReplyField value={text} onChange={setText} />
        <Button type="submit" disabled={send.isPending || !text.trim()}>
          <SendHorizontal aria-hidden="true" />
          {send.isPending ? Copy.sending : Copy.send}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{Copy.composerHint}</p>
    </form>
  );
}

function ReplyField({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (v: string) => void }>) {
  return (
    <textarea
      id={FIELD}
      value={value}
      rows={2}
      maxLength={MAX_LENGTH}
      placeholder={Copy.composerPlaceholder}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      className="max-h-40 min-h-11 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-base outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
    />
  );
}
