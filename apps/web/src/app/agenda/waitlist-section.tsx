import { Button } from '@/components/ui/button';
import { restoreOnError, useLeaving } from '@/components/ui/undo';
import { feedback } from '../setup/feedback';
import { AgendaCopy } from './agenda-copy';
import { lastDayOf, shortDay } from './agenda-dates';
import { useRemoveWaitlist, type WaitlistItem } from './agenda-api';

// M-09 (spec 10, "Agenda"): who asked the assistant to be told when a slot opens on this day.
// When a time frees up, the assistant offers it to the first in line; the owner can take
// someone off the list.

const Copy = {
  heading: 'Lista de espera',
  intro: 'Se um horário vagar, o assistente avisa o primeiro da lista.',
  until: (day: string) => `até ${day}`,
  remove: 'Tirar da lista',
  removeLabel: (name: string) => `Tirar ${name} da lista de espera`,
  removed: 'Removido da lista de espera.',
} as const;

interface SectionProps {
  items: WaitlistItem[];
  timezone: string;
  /** Week view: the explanation once is enough; each day keeps only the names. */
  compact: boolean;
}

export function WaitlistSection({ items, timezone, compact }: Readonly<SectionProps>) {
  if (items.length === 0) return null;
  return (
    <section aria-label={Copy.heading} className="grid min-w-0 grid-cols-1 gap-1 px-4 pt-2 md:px-0">
      <h3 className="text-sm font-semibold">
        {Copy.heading} <span className="font-normal text-muted-foreground">· {items.length}</span>
      </h3>
      {!compact && <p className="text-sm text-muted-foreground">{Copy.intro}</p>}
      <ol className="mt-1 divide-y rounded-xl border border-dashed">
        {items.map((item) => (
          <WaitlistRow key={item.id} item={item} timezone={timezone} />
        ))}
      </ol>
    </section>
  );
}

function WaitlistRow({ item, timezone }: Readonly<{ item: WaitlistItem; timezone: string }>) {
  const remove = useRemoveWaitlist();
  const { gone, leave } = useLeaving();
  const name = item.patientName ?? item.patientPhone ?? AgendaCopy.noPatient;
  if (gone) return null;
  return (
    <li className="flex min-h-[56px] items-center gap-3 py-1 pr-1 pl-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{name}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {Copy.until(shortDay(lastDayOf(item.windowEnd, timezone)))} · {item.serviceName}
        </span>
      </span>
      <Button
        variant="ghost"
        className="min-h-11"
        aria-label={Copy.removeLabel(name)}
        disabled={remove.isPending}
        onClick={() => {
          leave({
            message: Copy.removed,
            commit: (restore) => {
              remove.mutate(item.id, restoreOnError(restore, feedback.onError));
            },
          });
        }}
      >
        {Copy.remove}
      </Button>
    </li>
  );
}
