import { LoadError } from '../inbox/query-states';
import { Button } from '@/components/ui/button';
import { BookingCopy as Copy } from './agenda-copy';
import { timeLabel } from './agenda-dates';
import { useSlots, type Slot } from './agenda-api';
import { Initials } from './professional-controls';

interface SlotPickerProps {
  day: string;
  serviceId: string;
  /** Only this professional's slots (the Agenda filter, or a move); else everyone's. */
  professionalId?: string | undefined;
  timezone: string;
  value: Slot | null;
  onChange: (slot: Slot) => void;
}

const same = (a: Slot | null, b: Slot) =>
  a?.startsAt === b.startsAt && a.professionalId === b.professionalId;

/** The free slots of the day (same `availableSlots` the assistant uses); one tap picks one. */
export function SlotPicker(props: Readonly<SlotPickerProps>) {
  const { day, serviceId, professionalId, timezone, value, onChange } = props;
  const slots = useSlots(day, serviceId);
  const list = (slots.data?.slots ?? []).filter(
    (slot) => !professionalId || slot.professionalId === professionalId,
  );
  const named = new Set(list.map((slot) => slot.professionalId)).size > 1;
  return (
    <div className="grid gap-2" aria-live="polite">
      <p className="text-sm font-semibold">{Copy.slots}</p>
      <SlotNotes serviceId={serviceId} slots={slots} empty={list.length === 0} />
      <div className="flex flex-wrap gap-2">
        {list.map((slot) => (
          <Button
            key={`${slot.startsAt}-${slot.professionalId}`}
            type="button"
            variant={same(value, slot) ? 'default' : 'outline'}
            aria-pressed={same(value, slot)}
            aria-label={
              named ? `${timeLabel(slot.startsAt, timezone)} ${slot.professionalName}` : undefined
            }
            className="tabular-nums"
            onClick={() => {
              onChange(slot);
            }}
          >
            {timeLabel(slot.startsAt, timezone)}
            {named && <Initials name={slot.professionalName} />}
          </Button>
        ))}
      </div>
    </div>
  );
}

interface NotesProps {
  serviceId: string;
  slots: ReturnType<typeof useSlots>;
  empty: boolean;
}

function SlotNotes({ serviceId, slots, empty }: Readonly<NotesProps>) {
  return (
    <>
      {slots.isPending && serviceId && (
        <p className="text-sm text-muted-foreground">{Copy.loadingSlots}</p>
      )}
      {slots.isError && (
        <LoadError message={Copy.slotsFailed} onRetry={() => void slots.refetch()} />
      )}
      {slots.data && empty && <p className="text-sm text-muted-foreground">{Copy.noSlots}</p>}
    </>
  );
}
