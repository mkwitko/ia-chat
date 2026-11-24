import { cn } from '@/lib/utils';
import { shortTime } from './conversation-row';
import {
  Author,
  Control,
  type ConversationDetail,
  type ControlEvent,
  type MessageView,
} from './inbox-api';
import { AuthorCopy, ConversationCopy as Copy, TypePreview } from './inbox-copy';

// Spec 10, "Conversa": authorship by label and position, never by color alone (RN-55).

const Reason = {
  ownerEcho: 'owner_echo',
  agentHandoff: 'agent_handoff',
  safety: 'safety',
} as const;
const AUDIO = 'audio';
const Kind = { message: 'message', event: 'event' } as const;

type Entry =
  | { kind: typeof Kind.message; at: string; message: MessageView }
  | { kind: typeof Kind.event; at: string; event: ControlEvent };

function entriesOf({ messages, events }: Pick<ConversationDetail, 'messages' | 'events'>): Entry[] {
  const all: Entry[] = [
    ...messages.map((message): Entry => ({ kind: Kind.message, at: message.at, message })),
    ...events.map((event): Entry => ({ kind: Kind.event, at: event.at, event })),
  ];
  return all.sort((a, b) => a.at.localeCompare(b.at));
}

function eventText({ to, reason }: ControlEvent): string {
  if (to === Control.ai) return Copy.gaveBack;
  if (reason === Reason.ownerEcho) return Copy.ownerEcho;
  if (reason === Reason.agentHandoff) return Copy.handoff;
  if (reason === Reason.safety) return Copy.safety;
  return Copy.tookOver;
}

export function Timeline(props: Readonly<Pick<ConversationDetail, 'messages' | 'events'>>) {
  const entries = entriesOf(props);
  if (entries.length === 0)
    return <p className="px-4 py-8 text-sm text-muted-foreground">{Copy.empty}</p>;
  return (
    <ol aria-label={Copy.messages} className="grid gap-2 px-4 py-4">
      {entries.map((entry) => (
        <li
          key={entry.kind === Kind.message ? entry.message.id : `event-${entry.at}`}
          className="grid"
        >
          {entry.kind === Kind.message ? (
            <Bubble message={entry.message} />
          ) : (
            <p className="justify-self-center rounded-full bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
              {eventText(entry.event)} às {shortTime(entry.at)}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

const SIDE: Record<Author, string> = {
  [Author.patient]: 'justify-self-start bg-card border',
  [Author.assistant]: 'justify-self-end bg-brand-soft',
  [Author.professional]: 'justify-self-end bg-primary text-primary-foreground',
  [Author.system]: 'justify-self-center bg-muted text-muted-foreground',
};

function bodyOf({ type, text }: MessageView): string {
  if (text) return text;
  if (type === AUDIO) return Copy.audioNoTranscript;
  const label = TypePreview[type];
  return label ? Copy.mediaNote(label) : '';
}

function Bubble({ message }: Readonly<{ message: MessageView }>) {
  const mine = message.author === Author.assistant || message.author === Author.professional;
  return (
    <div className={cn('max-w-[85%] rounded-2xl px-3 py-2', SIDE[message.author])}>
      <p className={cn('text-xs font-semibold', mine ? 'opacity-80' : 'text-muted-foreground')}>
        {AuthorCopy[message.author]}
      </p>
      <p className="text-base break-words whitespace-pre-wrap">{bodyOf(message)}</p>
      <time
        dateTime={message.at}
        className="mt-0.5 block text-right text-[11px] opacity-70 tabular-nums"
      >
        {shortTime(message.at)}
      </time>
    </div>
  );
}
