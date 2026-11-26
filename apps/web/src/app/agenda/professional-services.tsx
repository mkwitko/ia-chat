import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ListSkeleton } from '../inbox/query-states';
import { feedback } from '../setup/feedback';
import { FormActions } from '../setup/fields';
import { useServices, type Service } from '../setup/setup-api';
import { useProfessionalServices, useSaveProfessionalServices } from './professional-api';
import { ProfessionalCopy as Copy } from './professional-copy';

const CHIP =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors hover:border-line-strong has-focus-visible:outline-2 has-focus-visible:outline-ring';
const CHOSEN = 'border-primary bg-primary text-primary-foreground';

/** Spec 05: which services this professional performs; none chosen means all of them (H-42). */
export function ProfessionalServices({ professionalId }: Readonly<{ professionalId: string }>) {
  const services = useServices();
  const linked = useProfessionalServices(professionalId);
  return (
    <section className="grid gap-3 px-4 md:px-0" aria-labelledby="pro-services-heading">
      <h2 id="pro-services-heading" className="text-lg">
        {Copy.servicesHeading}
      </h2>
      <p className="text-sm text-muted-foreground">{Copy.servicesIntro}</p>
      {(services.isPending || linked.isPending) && <ListSkeleton />}
      {services.data && linked.data && (
        <ServicesForm
          professionalId={professionalId}
          services={services.data.services}
          initial={linked.data.serviceIds}
        />
      )}
    </section>
  );
}

interface FormProps {
  professionalId: string;
  services: Service[];
  initial: string[];
}

function ServicesForm({ professionalId, services, initial }: Readonly<FormProps>) {
  const [all, setAll] = useState(initial.length === 0);
  const [chosen, setChosen] = useState(initial);
  const save = useSaveProfessionalServices(professionalId);
  const toggle = (id: string) => {
    setChosen(chosen.includes(id) ? chosen.filter((one) => one !== id) : [...chosen, id]);
  };
  const invalid = !all && chosen.length === 0;
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(all ? [] : chosen, feedback);
      }}
    >
      <Chip
        label={Copy.allServices}
        checked={all}
        onToggle={() => {
          setAll(!all);
        }}
      />
      {!all && <ServiceChips services={services} chosen={chosen} onToggle={toggle} />}
      {invalid && <p className="text-sm text-muted-foreground">{Copy.pickOne}</p>}
      <FormActions pending={save.isPending} disabled={invalid} />
    </form>
  );
}

interface ChipsProps {
  services: Service[];
  chosen: string[];
  onToggle: (id: string) => void;
}

function ServiceChips({ services, chosen, onToggle }: Readonly<ChipsProps>) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">{Copy.servicesHeading}</legend>
      {services.map((service) => (
        <Chip
          key={service.id}
          label={service.name}
          checked={chosen.includes(service.id)}
          onToggle={() => {
            onToggle(service.id);
          }}
        />
      ))}
    </fieldset>
  );
}

interface ChipProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

function Chip({ label, checked, onToggle }: Readonly<ChipProps>) {
  return (
    <label className={cn(CHIP, 'w-fit', checked && CHOSEN)}>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onToggle} />
      {label}
    </label>
  );
}
