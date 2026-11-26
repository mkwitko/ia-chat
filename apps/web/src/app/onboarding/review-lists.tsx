import { Input } from '@/components/ui/input';
import { formatCents, parseReais } from '@/lib/money';
import { AvailabilityCopy } from '../agenda/agenda-copy';
import type { PrefillSuggestion } from './onboarding-api';
import type { ReviewDraft, ServiceDraft } from './prefill-model';
import { PrefillCopy as Copy } from './prefill-copy';

const CHECKBOX = 'size-5 shrink-0 accent-primary';

interface ServicesProps {
  services: ServiceDraft[];
  onChange: (services: ServiceDraft[]) => void;
}

/** Each found service: keep it or not, fix duration and price. No price, no save. */
export function ReviewServices({ services, onChange }: Readonly<ServicesProps>) {
  const patch = (index: number, change: Partial<ServiceDraft>) => {
    onChange(services.map((item, at) => (at === index ? { ...item, ...change } : item)));
  };
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 font-semibold">{Copy.servicesHeading}</legend>
      {services.length > 0 && (
        <p
          className="grid grid-cols-2 gap-2 pl-11 text-xs text-muted-foreground"
          aria-hidden="true"
        >
          <span>{Copy.minutes}</span>
          <span>{Copy.price}</span>
        </p>
      )}
      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">{Copy.servicesNone}</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {services.map((service, index) => (
            <ServiceRow
              key={`${service.name}-${String(index)}`}
              service={service}
              onPatch={(change) => {
                patch(index, change);
              }}
            />
          ))}
        </ul>
      )}
    </fieldset>
  );
}

function ServiceRow({
  service,
  onPatch,
}: Readonly<{ service: ServiceDraft; onPatch: (change: Partial<ServiceDraft>) => void }>) {
  const priced = parseReais(service.price) !== null;
  return (
    <li className="grid gap-2 p-3">
      <label className="flex min-h-11 items-center gap-3 font-medium">
        <input
          type="checkbox"
          className={CHECKBOX}
          checked={service.keep && priced}
          disabled={!priced}
          aria-label={Copy.serviceLabel(service.name)}
          onChange={(event) => {
            onPatch({ keep: event.target.checked });
          }}
        />
        {service.name}
      </label>
      <ServiceInputs service={service} onPatch={onPatch} />
      {!priced && <p className="pl-8 text-sm text-attention">{Copy.priceMissing}</p>}
    </li>
  );
}

function ServiceInputs({
  service,
  onPatch,
}: Readonly<{ service: ServiceDraft; onPatch: (change: Partial<ServiceDraft>) => void }>) {
  return (
    <div className="grid grid-cols-2 gap-2 pl-8">
      <Input
        aria-label={`${Copy.minutes}: ${service.name}`}
        inputMode="numeric"
        value={service.minutes}
        onChange={(event) => {
          onPatch({ minutes: event.target.value });
        }}
      />
      <Input
        aria-label={`${Copy.price}: ${service.name}`}
        inputMode="decimal"
        placeholder={Copy.price}
        value={service.price}
        onChange={(event) => {
          const price = event.target.value;
          onPatch({ price, keep: parseReais(price) !== null });
        }}
      />
    </div>
  );
}

interface HoursProps {
  hours: PrefillSuggestion['hours'];
  keep: boolean;
  onKeep: (keep: boolean) => void;
}

/** The weekly grid found on the page, read-only here; it is edited in the hours step. */
export function ReviewHours({ hours, keep, onKeep }: Readonly<HoursProps>) {
  if (hours.length === 0) return <p className="text-sm text-muted-foreground">{Copy.hoursNone}</p>;
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-semibold">{Copy.hoursHeading}</legend>
      <ul className="grid gap-1 text-sm tabular-nums">
        {hours.map((rule) => (
          <li key={`${String(rule.weekday)}-${rule.start}`}>
            {AvailabilityCopy.weekdays[rule.weekday]}: {rule.start} às {rule.end}
          </li>
        ))}
      </ul>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          className={CHECKBOX}
          checked={keep}
          onChange={(event) => {
            onKeep(event.target.checked);
          }}
        />
        {Copy.hoursKeep}
      </label>
    </fieldset>
  );
}

interface PackagesProps {
  packages: ReviewDraft['packages'];
  onChange: (packages: ReviewDraft['packages']) => void;
}

/** Packages found with a written price: a tap keeps or drops each one. */
export function ReviewPackages({ packages, onChange }: Readonly<PackagesProps>) {
  if (packages.length === 0) return null;
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-semibold">{Copy.packagesHeading}</legend>
      {packages.map((item, index) => (
        <label key={`${item.name}-${String(index)}`} className="flex min-h-11 items-center gap-3">
          <input
            type="checkbox"
            className={CHECKBOX}
            checked={item.keep}
            onChange={(event) => {
              const keep = event.target.checked;
              onChange(packages.map((other, at) => (at === index ? { ...other, keep } : other)));
            }}
          />
          <span className="flex-1 font-medium">{item.name}</span>
          <span className="tabular-nums">{formatCents(item.priceCents)}</span>
        </label>
      ))}
    </fieldset>
  );
}
