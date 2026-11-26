import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { AreaField, TextField } from './fields';
import { feedback } from './feedback';
import { useLocation, useSaveLocation, type Location } from './setup-api';
import { CommonCopy, ServicesCopy as Copy } from './setup-copy';

const PARAGRAPH = '\n\n';

/** Address and arrival instructions, with a preview of what the patient receives (RF-05). */
export function LocationSection() {
  const location = useLocation();
  if (!location.data) return null;
  return <LocationForm initial={location.data.location} />;
}

function LocationForm({ initial }: Readonly<{ initial: Location | null }>) {
  const [address, setAddress] = useState(initial?.address ?? '');
  const [arrival, setArrival] = useState(initial?.arrivalInstructions ?? '');
  const save = useSaveLocation();
  const submit = () => {
    save.mutate({ address, arrivalInstructions: arrival.trim() || null }, feedback);
  };
  return (
    <form
      className="grid gap-4 px-4 md:px-0"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <h2 className="text-lg">{Copy.locationHeading}</h2>
      <TextField
        id="location-address"
        label={Copy.address}
        value={address}
        onChange={setAddress}
        required
        maxLength={300}
        placeholder={Copy.addressPlaceholder}
      />
      <AreaField
        id="location-arrival"
        label={Copy.arrival}
        value={arrival}
        onChange={setArrival}
        maxLength={1000}
        placeholder={Copy.arrivalPlaceholder}
      />
      <Preview text={[address.trim(), arrival.trim()].filter(Boolean).join(PARAGRAPH)} />
      <Button
        type="submit"
        disabled={save.isPending}
        className="w-full md:w-auto md:justify-self-start"
      >
        {save.isPending ? CommonCopy.saving : CommonCopy.save}
      </Button>
    </form>
  );
}

function Preview({ text }: Readonly<{ text: string }>) {
  if (!text) return null;
  return (
    <div className="grid gap-2 text-sm">
      <span className="text-muted-foreground">{Copy.preview}</span>
      <p className="max-w-sm rounded-xl rounded-tl-sm bg-jade-soft px-3 py-2 whitespace-pre-line">
        {text}
      </p>
    </div>
  );
}
