import { useDeferredValue, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TextField } from '../setup/fields';
import { BookingCopy as Copy, AgendaCopy } from './agenda-copy';
import { usePatients, type Patient, type PatientChoice } from './agenda-api';

interface PickerProps {
  onChange: (choice: PatientChoice | null) => void;
}

/** Existing patient (search by name or phone) or a new one; reports the choice or null. */
export function PatientPicker({ onChange }: Readonly<PickerProps>) {
  const [creating, setCreating] = useState(false);
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 text-sm font-semibold">{Copy.patient}</legend>
      {creating ? <NewPatient onChange={onChange} /> : <FindPatient onChange={onChange} />}
      <Button
        type="button"
        variant="ghost"
        className="justify-self-start"
        onClick={() => {
          onChange(null);
          setCreating(!creating);
        }}
      >
        {creating ? Copy.existingPatient : Copy.newPatient}
      </Button>
    </fieldset>
  );
}

function label(patient: Patient): string {
  return patient.name ?? patient.phoneE164 ?? AgendaCopy.noPatient;
}

function FindPatient({ onChange }: Readonly<PickerProps>) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | null>(null);
  const found = usePatients(useDeferredValue(query));
  const patients = found.data?.patients ?? [];
  return (
    <div className="grid gap-2">
      <TextField id="patient-search" label={Copy.search} value={query} onChange={setQuery} />
      {found.data && patients.length === 0 && (
        <p className="text-sm text-muted-foreground">{Copy.noMatch}</p>
      )}
      <ul className="grid max-h-56 gap-1 overflow-y-auto">
        {patients.map((patient) => (
          <li key={patient.id}>
            <Button
              type="button"
              variant={picked === patient.id ? 'default' : 'outline'}
              aria-pressed={picked === patient.id}
              className="w-full justify-start"
              onClick={() => {
                setPicked(patient.id);
                onChange({ contactId: patient.id });
              }}
            >
              {label(patient)}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewPatient({ onChange }: Readonly<PickerProps>) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const report = (next: { name: string; phone: string }) => {
    const ready = Boolean(next.name.trim() && next.phone.trim());
    onChange(ready ? { newPatient: { name: next.name.trim(), phone: next.phone.trim() } } : null);
  };
  return (
    <div className="grid gap-3">
      <TextField
        id="patient-name"
        label={Copy.name}
        value={name}
        onChange={(value) => {
          setName(value);
          report({ name: value, phone });
        }}
        maxLength={120}
      />
      <TextField
        id="patient-phone"
        label={Copy.phone}
        hint={Copy.phoneHint}
        value={phone}
        inputMode="tel"
        onChange={(value) => {
          setPhone(value);
          report({ name, phone: value });
        }}
      />
    </div>
  );
}
