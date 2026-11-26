import { StatusCopy } from '../clinic/clinic-copy';
import { TopicStatus } from '../clinic/clinic-model';
import { SummaryList, type SummaryItem } from './summary-list';

interface SummaryScreenProps {
  title: string;
  intro: string;
  items: readonly SummaryItem[];
}

/** A settings page as a summary (owner, 26/11/2026): title, one line, how much is left, the rows. */
export function SummaryScreen({ title, intro, items }: Readonly<SummaryScreenProps>) {
  const left = items.filter((item) => item.summary?.status === TopicStatus.todo).length;
  const loaded = items.every((item) => item.summary !== undefined);
  const tracked = items.some((item) => item.summary?.status);
  return (
    <section className="w-full pt-5 pb-16 md:px-8 md:pt-8 xl:px-12">
      <div className="grid max-w-2xl gap-5">
        <div className="grid gap-1 px-4 md:px-0">
          <h1 className="text-xl">{title}</h1>
          <p className="text-base text-muted-foreground">{intro}</p>
          {loaded && tracked && (
            <p role="status" className="pt-1 text-sm font-medium">
              {left ? StatusCopy.waiting(left) : StatusCopy.allDone}
            </p>
          )}
        </div>
        <SummaryList items={items} />
      </div>
    </section>
  );
}
