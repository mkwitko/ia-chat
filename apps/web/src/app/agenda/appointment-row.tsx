import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { labelOf } from '@/i18n/messages';
import { commitOrRestore, useLeaving } from '@/components/ui/undo';
import { feedback } from '../setup/feedback';
import { AgendaCopy as Copy } from './agenda-copy';
import { dayOf, timeLabel } from './agenda-dates';
import { CalendarSync, CreatedBy, useCancel, type AppointmentItem } from './agenda-api';
import type { BookingTarget } from './booking-form';
import { ProfessionalTag } from './professional-controls';

interface RowProps {
  item: AppointmentItem;
  timezone: string;
  onMove: (target: BookingTarget) => void;
  /** Shown when the agenda mixes professionals. */
  professional?: string | undefined;
}

/** Patient, service and state; a tap opens remarcar and cancelar (spec 10, "Agenda"). */
export function AppointmentRow({ item, timezone, onMove, professional }: Readonly<RowProps>) {
  const [open, setOpen] = useState(false);
  const { gone, leave } = useLeaving();
  if (gone) return null;
  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        className="flex min-h-[64px] w-full items-center gap-3 px-4 py-2 text-left"
        onClick={() => {
          setOpen(!open);
        }}
      >
        <span className="w-14 shrink-0 font-semibold tabular-nums">
          {timeLabel(item.startsAt, timezone)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">
            {item.patientName ?? item.patientPhone ?? Copy.noPatient}
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {item.serviceName} · {labelOf(Copy.status, item.status) ?? item.status} ·{' '}
            {item.createdBy === CreatedBy.ai ? Copy.byAssistant : Copy.byYou}
            {item.calendarSync === CalendarSync.failed && ` · ${Copy.notSynced}`}
          </span>
          {professional && <ProfessionalTag name={professional} />}
        </span>
        <ChevronDown
          className={cn(
            'size-5 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>
      {open && <RowActions item={item} timezone={timezone} onMove={onMove} onCancel={leave} />}
    </li>
  );
}

function RowActions({
  item,
  timezone,
  onMove,
  onCancel,
}: Readonly<RowProps & { onCancel: ReturnType<typeof useLeaving>['leave'] }>) {
  const cancel = useCancel();
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      <Button
        variant="outline"
        onClick={() => {
          onMove({ kind: 'move', appointment: item, day: dayOf(item.startsAt, timezone) });
        }}
      >
        {Copy.reschedule}
      </Button>
      <Button
        variant="destructive"
        disabled={cancel.isPending}
        onClick={() => {
          // Desfazer instead of "Tem certeza?": the patient is only told once the toast closes.
          onCancel({
            message: Copy.cancelled,
            commit: (restore) => {
              commitOrRestore(() => cancel.mutateAsync(item.id), restore, feedback.onError);
            },
          });
        }}
      >
        {Copy.cancel}
      </Button>
    </div>
  );
}
