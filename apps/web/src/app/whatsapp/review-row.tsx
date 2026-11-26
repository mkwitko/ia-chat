import { LoadError } from '../inbox/query-states';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { dayLabel, dayTimeLabel } from '../customers/customer-format';
import { ReviewCopy as Copy } from './review-copy';
import { useStagedMessages, type StagedContact } from './review-api';

export interface RowState {
  client: boolean;
  messages: boolean;
}

interface RowProps {
  contact: StagedContact;
  state: RowState;
  onClient: () => void;
  onMessages: () => void;
}

const nameOf = (contact: StagedContact) => contact.name ?? contact.phone ?? Copy.noName;

/** One person from the phone book or an old thread: become a client, and bring the messages (off by default). */
export function ReviewRow({ contact, state, onClient, onMessages }: Readonly<RowProps>) {
  const [open, setOpen] = useState(false);
  return (
    <li className="grid gap-1 px-4 py-2 md:px-5">
      <label className="flex min-h-11 items-center gap-3">
        <input
          type="checkbox"
          className="size-5 shrink-0 accent-primary"
          aria-label={Copy.clientLabel(nameOf(contact))}
          checked={state.client}
          onChange={onClient}
        />
        <ContactLine contact={contact} />
      </label>
      {contact.messageCount > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 pl-8">
          <MessagesToggle state={state} onChange={onMessages} />
          <PreviewButton
            open={open}
            onToggle={() => {
              setOpen(!open);
            }}
          />
        </div>
      )}
      {open && <Preview id={contact.id} />}
    </li>
  );
}

function ContactLine({ contact }: Readonly<{ contact: StagedContact }>) {
  const details = [
    contact.name ? contact.phone : null,
    contact.messageCount > 0 ? Copy.messageCount(contact.messageCount) : Copy.noMessages,
    contact.lastMessageAt ? Copy.lastMessage(dayLabel(contact.lastMessageAt)) : null,
  ];
  return (
    <span className="grid min-w-0 flex-1">
      <span className="truncate font-semibold">{nameOf(contact)}</span>
      <span className="truncate text-sm text-muted-foreground tabular-nums">
        {details.filter(Boolean).join(' · ')}
      </span>
    </span>
  );
}

function MessagesToggle({ state, onChange }: Readonly<{ state: RowState; onChange: () => void }>) {
  return (
    <label
      className={cn(
        'flex min-h-11 items-center gap-2 text-sm font-medium',
        !state.client && 'text-muted-foreground',
      )}
    >
      <input
        type="checkbox"
        role="switch"
        className="size-5 shrink-0 accent-primary"
        checked={state.messages}
        disabled={!state.client}
        onChange={onChange}
      />
      {Copy.bringMessages}
    </label>
  );
}

function PreviewButton({ open, onToggle }: Readonly<{ open: boolean; onToggle: () => void }>) {
  return (
    <button
      type="button"
      aria-expanded={open}
      className="flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      onClick={onToggle}
    >
      {open ? Copy.hideMessages : Copy.showMessages}
      <ChevronDown
        className={cn('size-4 transition-transform', open && 'rotate-180')}
        aria-hidden="true"
      />
    </button>
  );
}

function Preview({ id }: Readonly<{ id: string }>) {
  const messages = useStagedMessages(id, true);
  if (messages.isError)
    return <LoadError message={Copy.previewFailed} onRetry={() => void messages.refetch()} />;
  return (
    <div className="ml-8 grid gap-2 rounded-lg bg-muted p-3" aria-busy={messages.isPending}>
      <p className="text-sm font-semibold">{Copy.previewHeading}</p>
      <ul className="grid gap-2">
        {messages.data?.map((message) => (
          <li key={message.id} className="grid text-sm">
            <span className="text-xs text-muted-foreground tabular-nums">
              {message.fromOwner ? Copy.previewMe : Copy.previewThem} · {dayTimeLabel(message.at)}
            </span>
            <span className={cn(message.text === null && 'text-muted-foreground italic')}>
              {message.text ?? Copy.previewMedia}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
