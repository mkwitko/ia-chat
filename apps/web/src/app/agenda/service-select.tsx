import { Label } from '@/components/ui/label';
import type { Service } from '../setup/setup-api';
import { BookingCopy as Copy } from './agenda-copy';

interface SelectProps {
  services: Service[];
  value: string;
  onChange: (id: string) => void;
}

/** Native select: 44 px tall, 16 px text, works with the phone's own picker. */
export function ServiceSelect({ services, value, onChange }: Readonly<SelectProps>) {
  if (services.length === 0)
    return <p className="text-sm text-muted-foreground">{Copy.noServices}</p>;
  return (
    <div className="grid gap-2">
      <Label htmlFor="booking-service">{Copy.service}</Label>
      <select
        id="booking-service"
        className="h-11 w-full rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        value={value}
        required
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        <option value="">{Copy.servicePlaceholder}</option>
        {services.map((service) => (
          <option key={service.id} value={service.id}>
            {service.name}
          </option>
        ))}
      </select>
    </div>
  );
}
