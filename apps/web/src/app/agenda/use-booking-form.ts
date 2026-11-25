import { useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { AgendaCopy } from './agenda-copy';
import { useBook, useReschedule, type AppointmentItem, type PatientChoice } from './agenda-api';

export const BookingKind = { new: 'new', move: 'move' } as const;

export type BookingTarget =
  | { kind: typeof BookingKind.new; day: string }
  | { kind: typeof BookingKind.move; appointment: AppointmentItem; day: string };

function errorText(error: Error): string {
  const known = error instanceof ApiError && error.code ? AgendaCopy.errors[error.code] : undefined;
  return known ?? AgendaCopy.failed;
}

function outcome(onClose: () => void, onFailure: () => void) {
  return (message: string) => ({
    onSuccess: () => {
      toast.success(message);
      onClose();
    },
    onError: (error: Error) => {
      toast.error(errorText(error));
      onFailure();
    },
  });
}

/**
 * State of the booking form: new (patient, service, day, slot) or move (day, slot).
 * One idempotency key per form, so a double tap books once.
 */
export function useBookingForm({
  target,
  onClose,
}: {
  target: BookingTarget;
  onClose: () => void;
}) {
  const moving = target.kind === BookingKind.move;
  const [key] = useState(() => crypto.randomUUID());
  const [patient, setPatient] = useState<PatientChoice | null>(null);
  const [serviceId, setServiceId] = useState(moving ? target.appointment.serviceId : '');
  const [day, setDay] = useState(target.day);
  const [startsAt, setStartsAt] = useState('');
  const book = useBook();
  const move = useReschedule();
  const done = outcome(onClose, () => {
    setStartsAt('');
  });
  const submit = () => {
    if (moving)
      move.mutate({ id: target.appointment.id, key, startsAt }, done(AgendaCopy.rescheduled));
    else if (patient) book.mutate({ key, serviceId, startsAt, patient }, done(AgendaCopy.booked));
  };
  return {
    moving,
    ready: Boolean(startsAt && serviceId && (moving || patient)),
    pending: book.isPending || move.isPending,
    patient: { set: setPatient },
    service: { id: serviceId, set: setServiceId },
    day: { value: day, set: setDay },
    slot: { value: startsAt, set: setStartsAt },
    submit,
  };
}
