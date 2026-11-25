import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { feedback } from '../setup/feedback';
import { AgendaCopy as Copy } from './agenda-copy';
import { dayOf, timeLabel } from './agenda-dates';
import { CalendarSync, CreatedBy, useCancel, type AppointmentItem } from './agenda-api';
import type { BookingTarget } from './booking-form';

interface RowProps {
  item: AppointmentItem;
  timezone: string;
  onMove: (target: BookingTarget) => void;
}

/** Patient, service and state; a tap opens remarcar and cancelar (spec 10, "Agenda"). */
export function AppointmentRow({ item, timezone, onMove }: Readonly<RowProps>) {
  const [open, setOpen] = useState(false);
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
            {item.serviceName} · {Copy.status[item.status] ?? item.status} ·{' '}
            {item.createdBy === CreatedBy.ai ? Copy.byAssistant : Copy.byYou}
            {item.calendarSync === CalendarSync.failed && ` · ${Copy.notSynced}`}
          </span>
        </span>
      </button>
      {open && <RowActions item={item} timezone={timezone} onMove={onMove} />}
    </li>
  );
}

function RowActions({ item, timezone, onMove }: Readonly<RowProps>) {
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
          if (window.confirm(Copy.cancelConfirm))
            cancel.mutate(item.id, {
              onSuccess: () => toast.success(Copy.cancelled),
              onError: feedback.onError,
            });
        }}
      >
        {Copy.cancel}
      </Button>
    </div>
  );
}
