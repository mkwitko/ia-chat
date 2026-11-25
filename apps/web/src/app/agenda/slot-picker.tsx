import { Button } from '@/components/ui/button';
import { BookingCopy as Copy } from './agenda-copy';
import { timeLabel } from './agenda-dates';
import { useSlots } from './agenda-api';

interface SlotPickerProps {
  day: string;
  serviceId: string;
  timezone: string;
  value: string;
  onChange: (startsAt: string) => void;
}

/** The free slots of the day (same `availableSlots` the assistant uses); one tap picks one. */
export function SlotPicker({
  day,
  serviceId,
  timezone,
  value,
  onChange,
}: Readonly<SlotPickerProps>) {
  const slots = useSlots(day, serviceId);
  const list = slots.data?.slots ?? [];
  return (
    <div className="grid gap-2" aria-live="polite">
      <p className="text-sm font-semibold">{Copy.slots}</p>
      <SlotNotes serviceId={serviceId} slots={slots} />
      <div className="flex flex-wrap gap-2">
        {list.map((slot) => (
          <Button
            key={slot.startsAt}
            type="button"
            variant={value === slot.startsAt ? 'default' : 'outline'}
            aria-pressed={value === slot.startsAt}
            className="tabular-nums"
            onClick={() => {
              onChange(slot.startsAt);
            }}
          >
            {timeLabel(slot.startsAt, timezone)}
          </Button>
        ))}
      </div>
    </div>
  );
}

function SlotNotes({
  serviceId,
  slots,
}: Readonly<{ serviceId: string; slots: ReturnType<typeof useSlots> }>) {
  return (
    <>
      {slots.isPending && serviceId && (
        <p className="text-sm text-muted-foreground">{Copy.loadingSlots}</p>
      )}
      {slots.isError && (
        <p role="alert" className="text-sm text-danger">
          {Copy.slotsFailed}
        </p>
      )}
      {slots.data?.slots.length === 0 && (
        <p className="text-sm text-muted-foreground">{Copy.noSlots}</p>
      )}
    </>
  );
}
