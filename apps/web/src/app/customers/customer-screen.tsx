import { MessageCircle } from 'lucide-react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { conversationPath, Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { MoreOptions } from '../screens/editor-screen';
import { Screen, ScreenWidth } from '../screens/screen';
import { Note } from '../screens/section';
import { AppointmentsSection } from './customer-appointments';
import { ConsentSection } from './customer-consent';
import { PackagesSection } from './customer-packages';
import { customerName, formatPhone } from './customer-format';
import { OriginSection } from './customer-origin';
import { StageSection } from './customer-stage';
import { useCustomer } from './customers-api';
import { CustomerCopy as Copy } from './customers-copy';
import type { CustomerDetail } from './customers-types';
import { StageBadge } from './stage-badge';

const NOT_FOUND = 404;

/** Spec 10, "Cliente": origin, appointments, packages, consent and status of one person. */
export function CustomerScreen() {
  const { id = '' } = useParams();
  const customer = useCustomer(id);
  const missing = customer.error instanceof ApiError && customer.error.status === NOT_FOUND;
  return (
    <Screen
      title={customer.data ? customerName(customer.data) : Copy.back}
      width={ScreenWidth.form}
    >
      <BackLink to={Route.customers} label={Copy.back} />
      {customer.isPending && <ListSkeleton />}
      {missing && <p className="px-4 py-6 md:px-0">{Copy.notFound}</p>}
      {customer.isError && !missing && (
        <LoadError message={Copy.loadFailed} onRetry={() => void customer.refetch()} />
      )}
      {customer.data && <Content customer={customer.data} />}
    </Screen>
  );
}

function Content({ customer }: Readonly<{ customer: CustomerDetail }>) {
  return (
    <div className="grid pb-10">
      <div className="grid gap-2 px-4 pb-2 md:px-0">
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {customer.phone && <span className="tabular-nums">{formatPhone(customer.phone)}</span>}
          <StageBadge stage={customer.stage} />
        </p>
        {customer.conversationId && (
          <Button asChild className="w-full sm:w-fit">
            <Link to={conversationPath(customer.conversationId)}>
              <MessageCircle aria-hidden="true" />
              {Copy.openConversation}
            </Link>
          </Button>
        )}
      </div>
      <AppointmentsSection appointments={customer.appointments} />
      <PackagesSection customerId={customer.id} />
      <div className="px-4 pt-8 md:px-0">
        <MoreOptions flush label={Copy.moreLabel}>
          <Note>{Copy.autoStatus}</Note>
          <OriginSection customer={customer} />
          <ConsentSection
            customerId={customer.id}
            optedOut={customer.optedOut}
            entries={customer.consent}
          />
          <StageSection customerId={customer.id} stage={customer.stage} entries={customer.stages} />
        </MoreOptions>
      </div>
    </div>
  );
}
