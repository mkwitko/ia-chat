import { toast } from 'sonner';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { AddButton } from '../setup/add-button';
import { feedback } from '../setup/feedback';
import { CommonCopy } from '../setup/setup-copy';
import { NEW_ITEM, useEditing } from '../setup/use-editing';
import { AvailabilityCopy as Copy } from './agenda-copy';
import { lastDayOf, shortDay } from './agenda-dates';
import {
  TimeOffKind,
  useCreateTimeOff,
  useRemoveTimeOff,
  useTimeOffs,
  type TimeOffItem,
} from './agenda-api';
import { TimeOffForm } from './time-off-form';
import { Button } from '@/components/ui/button';

interface SectionProps {
  timezone: string;
  /** Whose blocks and vacations; absent: the first professional's. */
  professionalId?: string | undefined;
}

/** RF-41 and RF-14: upcoming blocks and vacations, with the form to add one. */
export function TimeOffSection({ timezone, professionalId }: Readonly<SectionProps>) {
  const offs = useTimeOffs(professionalId);
  return (
    <section className="grid gap-3">
      <h2 className="px-4 text-lg md:px-0">{Copy.offHeading}</h2>
      <p className="px-4 text-sm text-muted-foreground md:px-0">{Copy.offIntro}</p>
      {offs.isPending && <ListSkeleton />}
      {offs.isError && (
        <LoadError message={CommonCopy.loadFailed} onRetry={() => void offs.refetch()} />
      )}
      {offs.data && (
        <TimeOffList
          timeOffs={offs.data.timeOffs}
          timezone={timezone}
          professionalId={professionalId}
        />
      )}
    </section>
  );
}

function TimeOffList({
  timeOffs,
  timezone,
  professionalId,
}: Readonly<SectionProps & { timeOffs: TimeOffItem[] }>) {
  const edit = useEditing();
  const create = useCreateTimeOff(professionalId);
  return (
    <div className="grid gap-3 px-4 md:px-0">
      {timeOffs.length === 0 && edit.editing !== NEW_ITEM && (
        <p className="text-sm text-muted-foreground">{Copy.offEmpty}</p>
      )}
      {timeOffs.map((off) => (
        <TimeOffRow key={off.id} off={off} timezone={timezone} />
      ))}
      {edit.editing === NEW_ITEM ? (
        <TimeOffForm
          pending={create.isPending}
          onCancel={edit.close}
          onSubmit={(body) => {
            create.mutate(body, {
              ...edit.done,
              onSuccess: (result) => {
                edit.done.onSuccess();
                warnConflicts(result);
              },
            });
          }}
        />
      ) : (
        <AddButton
          label={Copy.addOff}
          onClick={() => {
            edit.open(NEW_ITEM);
          }}
        />
      )}
    </div>
  );
}

function warnConflicts(result: unknown) {
  const count = (result as { conflicts?: number } | undefined)?.conflicts ?? 0;
  if (count > 0) toast.warning(Copy.conflicts(count));
}

function TimeOffRow({ off, timezone }: Readonly<{ off: TimeOffItem; timezone: string }>) {
  const remove = useRemoveTimeOff();
  const first = shortDay(
    new Date(off.startsAt).toLocaleDateString('sv-SE', { timeZone: timezone }),
  );
  const kind = off.kind === TimeOffKind.vacation ? Copy.kindVacation : Copy.kindBlock;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border bg-card p-4">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{kind}</p>
        <p className="text-sm text-muted-foreground">
          {Copy.range(first, shortDay(lastDayOf(off.endsAt, timezone)))}
          {off.reason && ` · ${off.reason}`}
        </p>
      </div>
      <Button
        variant="ghost"
        className="text-danger"
        disabled={remove.isPending}
        onClick={() => {
          if (window.confirm(Copy.removeConfirm)) remove.mutate(off.id, feedback);
        }}
      >
        {CommonCopy.remove}
      </Button>
    </div>
  );
}
