import { FormActions, TextField } from '../setup/fields';
import { useServices } from '../setup/setup-api';
import { BookingCopy as Copy } from './agenda-copy';
import { PatientPicker } from './patient-picker';
import { ServiceSelect } from './service-select';
import { SlotPicker } from './slot-picker';
import { useBookingForm, type BookingTarget } from './use-booking-form';

export { BookingKind, type BookingTarget } from './use-booking-form';

interface FormProps {
  target: BookingTarget;
  timezone: string;
  onClose: () => void;
}

type Form = ReturnType<typeof useBookingForm>;

/** RF-48: the same rules and the same constraint as the assistant; a taken slot says so kindly. */
export function BookingForm({ target, timezone, onClose }: Readonly<FormProps>) {
  const form = useBookingForm({ target, onClose });
  return (
    <form
      className="mx-4 mb-4 grid gap-4 rounded-xl border bg-card p-4 md:mx-0"
      onSubmit={(event) => {
        event.preventDefault();
        form.submit();
      }}
    >
      <h2 className="text-lg">{form.moving ? Copy.titleMove : Copy.titleNew}</h2>
      {!form.moving && <NewBookingFields form={form} />}
      <TextField
        id="booking-day"
        label={Copy.day}
        type="date"
        value={form.day.value}
        onChange={(value) => {
          form.day.set(value);
          form.slot.set('');
        }}
      />
      <SlotPicker
        day={form.day.value}
        serviceId={form.service.id}
        timezone={timezone}
        value={form.slot.value}
        onChange={form.slot.set}
      />
      <FormActions
        pending={form.pending}
        disabled={!form.ready}
        saveLabel={form.moving ? Copy.submitMove : Copy.submit}
        onCancel={onClose}
        cancelLabel={Copy.close}
      />
    </form>
  );
}

function NewBookingFields({ form }: Readonly<{ form: Form }>) {
  const services = useServices();
  return (
    <>
      <PatientPicker onChange={form.patient.set} />
      <ServiceSelect
        services={services.data?.services ?? []}
        value={form.service.id}
        onChange={form.service.set}
      />
    </>
  );
}
