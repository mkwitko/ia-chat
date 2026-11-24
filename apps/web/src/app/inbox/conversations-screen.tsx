import { MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { EmptyCopy, NavCopy } from '@/copy';
import { cn } from '@/lib/utils';
import { EmptyState } from '../screens/empty-state';
import { Screen } from '../screens/screen';
import { ConversationRow } from './conversation-row';
import { InboxState, useConversations, type ConversationSummary } from './inbox-api';
import { FilterCopy, InboxCopy } from './inbox-copy';
import { ListSkeleton, LoadError } from './query-states';

const Filter = { all: 'all', needsYou: 'needs_you', assistant: 'assistant' } as const;
type Filter = (typeof Filter)[keyof typeof Filter];

const FILTERS: readonly { value: Filter; label: string }[] = [
  { value: Filter.all, label: FilterCopy.all },
  { value: Filter.needsYou, label: FilterCopy.needsYou },
  { value: Filter.assistant, label: FilterCopy.assistant },
];

const NEEDS_YOU = new Set<InboxState>([InboxState.needsYou, InboxState.awaitingApproval]);

export const needsYou = (item: ConversationSummary) => NEEDS_YOU.has(item.state);

function applyFilter(items: readonly ConversationSummary[], filter: Filter) {
  if (filter === Filter.needsYou) return items.filter(needsYou);
  if (filter === Filter.assistant)
    return items.filter((item) => item.state === InboxState.assistant);
  return items;
}

/** Spec 10, "Conversas": the ones that need the professional come first. */
export function ConversationsScreen() {
  const conversations = useConversations();
  const [filter, setFilter] = useState<Filter>(Filter.all);
  return (
    <Screen title={NavCopy.conversations}>
      {conversations.isPending && <ListSkeleton />}
      {conversations.isError && (
        <LoadError message={InboxCopy.loadFailed} onRetry={() => void conversations.refetch()} />
      )}
      {conversations.data?.length === 0 && (
        <EmptyState icon={MessageSquare} {...EmptyCopy.conversations} />
      )}
      {conversations.data && conversations.data.length > 0 && (
        <>
          <FilterBar value={filter} onChange={setFilter} />
          <List items={applyFilter(conversations.data, filter)} />
        </>
      )}
    </Screen>
  );
}

function FilterBar({
  value,
  onChange,
}: Readonly<{ value: Filter; onChange: (filter: Filter) => void }>) {
  return (
    <fieldset className="flex gap-2 overflow-x-auto [scrollbar-width:none] px-4 py-2 md:px-0">
      <legend className="sr-only">{FilterCopy.label}</legend>
      {FILTERS.map((option) => (
        <label
          key={option.value}
          className={cn(
            'flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
            value === option.value
              ? 'border-primary bg-brand-soft text-primary'
              : 'bg-card text-muted-foreground',
          )}
        >
          <input
            type="radio"
            name="inbox-filter"
            className="sr-only"
            checked={value === option.value}
            onChange={() => {
              onChange(option.value);
            }}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

function List({ items }: Readonly<{ items: readonly ConversationSummary[] }>) {
  if (items.length === 0)
    return (
      <p className="px-4 py-6 text-sm text-muted-foreground md:px-0">{InboxCopy.emptyFilter}</p>
    );
  return (
    <ul className="divide-y border-y bg-card md:rounded-xl md:border">
      {items.map((item) => (
        <li key={item.id}>
          <ConversationRow item={item} />
        </li>
      ))}
    </ul>
  );
}
