import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EmptyState, GhostRows } from '../screens/empty-state';
import { CardList } from '../screens/section';
import { Screen } from '../screens/screen';
import { CustomerRow } from './customer-row';
import { useCustomers } from './customers-api';
import { CustomersCopy as Copy } from './customers-copy';
import { StageLabel } from './customers-labels';
import { Stage } from './customers-types';
import { useDebounced } from './use-debounced';

const SEARCH_DELAY_MS = 300;
const ALL = null;
const FILTERS: readonly { value: Stage | null; label: string }[] = [
  { value: ALL, label: Copy.filterAll },
  ...[Stage.newContact, Stage.booked, Stage.attended, Stage.notBooked, Stage.lost].map((stage) => ({
    value: stage,
    label: StageLabel[stage],
  })),
];

/** Spec 10, "Clientes": every contact with its automatic status. */
export function CustomersScreen() {
  const [text, setText] = useState('');
  const [stage, setStage] = useState<Stage | null>(ALL);
  const query = useDebounced(text.trim(), SEARCH_DELAY_MS);
  return (
    <Screen title={Copy.title}>
      <div className="grid gap-1 px-4 pb-1 md:px-0">
        <Input
          type="search"
          aria-label={Copy.searchLabel}
          placeholder={Copy.searchLabel}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
          }}
        />
      </div>
      <FilterBar value={stage} onChange={setStage} />
      <Results query={query} stage={stage} />
    </Screen>
  );
}

function Results({ query, stage }: Readonly<{ query: string; stage: Stage | null }>) {
  const customers = useCustomers(query, stage);
  const filtered = Boolean(query) || stage !== ALL;
  if (customers.isPending) return <ListSkeleton />;
  if (customers.isError)
    return <LoadError message={Copy.loadFailed} onRetry={() => void customers.refetch()} />;
  if (customers.data.length === 0)
    return filtered ? (
      <p className="px-4 py-6 text-sm text-muted-foreground md:px-0">{Copy.emptyFilter}</p>
    ) : (
      <EmptyState {...Copy.empty} preview={<GhostRows rows={4} withAvatar={false} />} />
    );
  return (
    <CardList>
      {customers.data.map((customer) => (
        <li key={customer.id}>
          <CustomerRow customer={customer} />
        </li>
      ))}
    </CardList>
  );
}

function FilterBar({
  value,
  onChange,
}: Readonly<{ value: Stage | null; onChange: (stage: Stage | null) => void }>) {
  return (
    <fieldset className="relative flex min-w-0 gap-2 overflow-x-auto [scrollbar-width:none] px-4 py-2 md:px-0">
      <legend className="sr-only">{Copy.filterLabel}</legend>
      {FILTERS.map((option) => (
        <label
          key={option.label}
          className={cn(
            'flex min-h-11 shrink-0 cursor-pointer items-center rounded-full border px-4 text-sm font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring',
            value === option.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground',
          )}
        >
          <input
            type="radio"
            name="customer-stage"
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
