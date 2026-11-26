import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { useLocation } from 'react-router';
import { SEARCH_FIELD, SHORTCUT_ATTR } from '@/lib/shortcuts';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EmptyState, GhostRows } from '../screens/empty-state';
import { CardList } from '../screens/section';
import { ChoicePills } from '../screens/choice-pills';
import { Screen } from '../screens/screen';
import { HelpArticle } from '../screens/screen-help';
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
  // "/" from another screen lands here with the search ready to type in.
  const focusSearch = Boolean(
    (useLocation().state as { focusSearch?: boolean } | null)?.focusSearch,
  );
  return (
    <Screen title={Copy.title} help={HelpArticle.customers} hint={Copy.hint}>
      <div className="grid gap-1 px-4 pb-1 md:px-0">
        <Input
          {...{ [SHORTCUT_ATTR]: SEARCH_FIELD }}
          autoFocus={focusSearch}
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
    <ChoicePills
      name="customer-stage"
      legend={Copy.filterLabel}
      options={FILTERS}
      value={value}
      onChange={onChange}
    />
  );
}
