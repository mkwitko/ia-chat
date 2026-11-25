import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { feedback } from '../setup/feedback';
import { CardList, Note, Section } from '../screens/section';
import { dayTimeLabel } from './customer-format';
import { useRecordConsent } from './customers-api';
import { CustomerCopy as Copy } from './customers-copy';
import { ConsentCategoryLabel, ConsentKindLabel, ConsentSourceLabel } from './customers-labels';
import { ConsentKind, type ConsentEntry } from './customers-types';

/** Opt-in / opt-out history, and a button to record the opposite of the current state. */
export function ConsentSection({
  customerId,
  optedOut,
  entries,
}: Readonly<{ customerId: string; optedOut: boolean; entries: readonly ConsentEntry[] }>) {
  const record = useRecordConsent(customerId);
  const next = optedOut ? ConsentKind.optIn : ConsentKind.optOut;
  function onClick() {
    if (next === ConsentKind.optOut && !window.confirm(Copy.optOutConfirm)) return;
    record.mutate(next, {
      onSuccess: () => toast.success(Copy.consentSaved),
      onError: feedback.onError,
    });
  }
  return (
    <Section title={Copy.consentHeading}>
      {entries.length === 0 && <Note>{Copy.consentEmpty}</Note>}
      <CardList>
        {entries.map((entry) => (
          <li key={entry.id} className="grid gap-0.5 px-4 py-3">
            <span className="font-semibold">
              {ConsentKindLabel[entry.kind]}{' '}
              <span className="font-normal text-muted-foreground">
                {Copy.consentCategory(ConsentCategoryLabel[entry.category])}
              </span>
            </span>
            <span className="text-sm text-muted-foreground">
              {ConsentSourceLabel[entry.source]} · {dayTimeLabel(entry.at)}
            </span>
          </li>
        ))}
      </CardList>
      <div className="px-4 pt-3 md:px-0">
        <Button variant="outline" disabled={record.isPending} onClick={onClick}>
          {optedOut ? Copy.recordOptIn : Copy.recordOptOut}
        </Button>
      </div>
    </Section>
  );
}
