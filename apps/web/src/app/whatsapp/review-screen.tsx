import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen } from '../screens/screen';
import { ReviewActions } from './review-actions';
import { useReviewContacts, type StagedContact } from './review-api';
import { ReviewCopy as Copy } from './review-copy';
import { ReviewRow } from './review-row';
import { useReviewSelection } from './use-review-selection';

const matches = (contact: StagedContact, text: string) =>
  `${contact.name ?? ''} ${contact.phone ?? ''}`.toLowerCase().includes(text.toLowerCase());

const Note = ({ text }: Readonly<{ text: string }>) => (
  <p className="px-4 py-6 text-sm text-muted-foreground md:px-0">{text}</p>
);

/** Spec 03, "Revisar importação": the owner picks who becomes a client and whose messages come over. */
export function ReviewScreen() {
  const contacts = useReviewContacts();
  return (
    <Screen title={Copy.title}>
      <BackLink to={Route.clinicWhatsapp} label={Copy.back} />
      <p className="max-w-prose px-4 pb-4 text-muted-foreground md:px-0">{Copy.intro}</p>
      {contacts.isPending && <ListSkeleton />}
      {contacts.isError && (
        <LoadError message={Copy.loadFailed} onRetry={() => void contacts.refetch()} />
      )}
      {contacts.data?.length === 0 && <Note text={Copy.empty} />}
      {contacts.data && contacts.data.length > 0 && <Review contacts={contacts.data} />}
    </Screen>
  );
}

function Review({ contacts }: Readonly<{ contacts: StagedContact[] }>) {
  const [text, setText] = useState('');
  const selection = useReviewSelection();
  const visible = contacts.filter((contact) => matches(contact, text.trim()));
  const picked = selection.selections();
  const withMessages = picked.filter((one) => one.messages).length;
  return (
    <>
      <Toolbar
        text={text}
        onText={setText}
        onSelectAll={() => {
          selection.selectAll(visible.map((contact) => contact.id));
        }}
        onClear={selection.clear}
      />
      {visible.length === 0 && <Note text={Copy.emptyFilter} />}
      <ul className="divide-y border-y bg-card empty:hidden md:rounded-xl md:border">
        {visible.map((contact) => (
          <ReviewRow
            key={contact.id}
            contact={contact}
            state={selection.stateOf(contact.id)}
            onClient={() => {
              selection.toggleClient(contact.id);
            }}
            onMessages={() => {
              selection.toggleMessages(contact.id);
            }}
          />
        ))}
      </ul>
      <ReviewActions
        summary={Copy.summary(picked.length, contacts.length, withMessages)}
        selections={picked}
      />
    </>
  );
}

interface ToolbarProps {
  text: string;
  onText: (text: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
}

function Toolbar({ text, onText, onSelectAll, onClear }: Readonly<ToolbarProps>) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3 md:px-0">
      <Input
        type="search"
        className="min-w-0 flex-1 basis-60"
        aria-label={Copy.searchLabel}
        placeholder={Copy.searchLabel}
        value={text}
        onChange={(event) => {
          onText(event.target.value);
        }}
      />
      <Button variant="outline" onClick={onSelectAll}>
        {Copy.selectAll}
      </Button>
      <Button variant="ghost" onClick={onClear}>
        {Copy.selectNone}
      </Button>
    </div>
  );
}
