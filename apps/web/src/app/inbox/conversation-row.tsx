import { NavLink } from 'react-router';
import { cn } from '@/lib/utils';
import { conversationPath } from '@/routes';
import { InboxState, Author, type ConversationSummary } from './inbox-api';
import { InboxCopy, TypePreview } from './inbox-copy';
import { StateBadge } from './state-badge';

const INITIALS_MAX = 2;
const TIME = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
const DAY = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' });
const MS_PER_DAY = 86_400_000;

export const displayName = (item: Pick<ConversationSummary, 'name' | 'phone'>) =>
  item.name ?? item.phone ?? InboxCopy.noName;

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter((part) => /^\p{L}/u.test(part))
    .map((part) => part.charAt(0).toUpperCase());
  return letters.slice(0, INITIALS_MAX).join('') || '?';
}

/** Today: the hour. Before: the date. */
export function shortTime(iso: string, now = new Date()): string {
  const at = new Date(iso);
  return now.getTime() - at.getTime() < MS_PER_DAY && now.getDate() === at.getDate()
    ? TIME.format(at)
    : DAY.format(at);
}

function previewOf(last: ConversationSummary['lastMessage']): string {
  if (!last) return InboxCopy.noMessages;
  const body = last.redacted
    ? InboxCopy.redactedShort
    : (last.text ?? TypePreview[last.type] ?? '');
  if (last.author === Author.professional) return `${InboxCopy.you}${body}`;
  if (last.author === Author.assistant) return `${InboxCopy.assistantSaid}${body}`;
  return body;
}

const rowClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex min-h-[72px] items-center gap-3 px-4 py-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring',
    isActive && 'bg-muted',
  );

/** 72 px row (DESIGN.md): avatar, name, preview, time and who has the conversation. */
export function ConversationRow({
  item,
  inNeedsYouList = false,
}: Readonly<{ item: ConversationSummary; inNeedsYouList?: boolean }>) {
  const name = displayName(item);
  const waiting = item.state === InboxState.needsYou || item.state === InboxState.awaitingApproval;
  return (
    <NavLink to={conversationPath(item.id)} className={rowClass}>
      <span
        aria-hidden="true"
        className="grid size-11 shrink-0 place-items-center rounded-full border bg-muted text-sm font-semibold text-foreground"
      >
        {initials(name)}
      </span>
      <span className="grid min-w-0 flex-1 gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className={waiting ? 'truncate font-bold' : 'truncate font-semibold'}>{name}</span>
          {item.lastMessage && (
            <time
              dateTime={item.lastMessage.at}
              className="shrink-0 text-xs text-muted-foreground tabular-nums"
            >
              {shortTime(item.lastMessage.at)}
            </time>
          )}
        </span>
        <span className="truncate text-sm text-muted-foreground">
          {previewOf(item.lastMessage)}
        </span>
        <span className="flex items-center gap-2">
          {!(inNeedsYouList && item.state === InboxState.needsYou) && (
            <StateBadge state={item.state} />
          )}
          <UnreadCount count={item.unreadCount} />
        </span>
      </span>
    </NavLink>
  );
}

function UnreadCount({ count }: Readonly<{ count: number }>) {
  if (count === 0) return null;
  return (
    <span className="rounded-full bg-attention px-1.5 text-xs leading-5 font-semibold text-card tabular-nums">
      <span className="sr-only">{InboxCopy.unread(count)}</span>
      <span aria-hidden="true">{count}</span>
    </span>
  );
}
