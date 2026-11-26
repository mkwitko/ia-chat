import { Link } from 'react-router';
import { customerPath } from '@/routes';
import { customerName, dayLabel, dayTimeLabel } from './customer-format';
import { CustomersCopy as Copy } from './customers-copy';
import { OriginLabel } from './customers-labels';
import { Origin, type CustomerSummary } from './customers-types';
import { StageBadge } from './stage-badge';

/** Name or phone, origin, status and the two dates that matter; opens the customer. */
export function CustomerRow({ customer }: Readonly<{ customer: CustomerSummary }>) {
  const details = [
    // Most people come straight through WhatsApp: only a different origin is worth a word.
    customer.origin !== Origin.whatsappDirect && OriginLabel[customer.origin],
    customer.lastContactAt && `${Copy.lastContact} ${dayLabel(customer.lastContactAt)}`,
    customer.nextAppointmentAt &&
      `${Copy.nextAppointment} ${dayTimeLabel(customer.nextAppointmentAt)}`,
    customer.attendedCount > 0 && Copy.attendedCount(customer.attendedCount),
  ].filter(Boolean);
  return (
    <Link
      to={customerPath(customer.id)}
      className="grid min-h-[72px] gap-1 px-4 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{customerName(customer)}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {customer.optedOut && (
            <span className="rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">
              {Copy.optedOut}
            </span>
          )}
          <StageBadge stage={customer.stage} />
        </span>
      </span>
      <span className="text-sm text-muted-foreground">{details.join(' · ')}</span>
    </Link>
  );
}
