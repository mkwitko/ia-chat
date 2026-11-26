import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { confirmThen, questionOf } from '@/components/ui/confirm-dialog';
import { feedback } from '../setup/feedback';
import { CardList, Note, Section } from '../screens/section';
import { dayTimeLabel } from './customer-format';
import { useRecordConsent } from './customers-api';
import { CustomerCopy as Copy } from './customers-copy';
import { ConsentCategoryLabel, ConsentKindLabel, ConsentSourceLabel } from './customers-labels';
import { ConsentKind, type ConsentEntry } from './customers-types';

/** Opt-in / opt-out history. The owner can record an opt-out; only the client brings it back. */
export function ConsentSection({
  customerId,
  optedOut,
  entries,
}: Readonly<{ customerId: string; optedOut: boolean; entries: readonly ConsentEntry[] }>) {
  const record = useRecordConsent(customerId);
  function onClick() {
    confirmThen({ ...questionOf(Copy.optOutConfirm), confirm: Copy.optOutAction }, () => {
      record.mutate(ConsentKind.optOut, {
        onSuccess: () => toast.success(Copy.consentSaved),
        onError: feedback.onError,
      });
    });
  }
  return (
    <Section title={Copy.consentHeading}>
      {entries.length === 0 && <Note>{Copy.consentEmpty}</Note>}
      <CardList>
        {entries.map((entry) => (
          <ConsentRow key={entry.id} entry={entry} />
        ))}
      </CardList>
      <div className="px-4 pt-3 md:px-0">
        {optedOut ? (
          <Note>{Copy.optedOutNote}</Note>
        ) : (
          <Button variant="outline" disabled={record.isPending} onClick={onClick}>
            {Copy.recordOptOut}
          </Button>
        )}
      </div>
    </Section>
  );
}

function ConsentRow({ entry }: Readonly<{ entry: ConsentEntry }>) {
  return (
    <li className="grid gap-0.5 px-4 py-3">
      <span className="font-semibold">
        {ConsentKindLabel[entry.kind]}{' '}
        <span className="font-normal text-muted-foreground">
          {Copy.consentCategory(ConsentCategoryLabel[entry.category])}
        </span>
      </span>
      <span className="text-sm text-muted-foreground">
        {ConsentSourceLabel[entry.source]} · {dayTimeLabel(entry.at)}
      </span>
      {entry.noticeText && (
        <span className="text-sm text-muted-foreground">{entry.noticeText}</span>
      )}
    </li>
  );
}
