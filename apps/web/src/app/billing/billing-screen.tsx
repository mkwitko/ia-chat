import { AccountCopy } from '../account-settings/account-copy';
import { useState } from 'react';
import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen } from '../screens/screen';
import { useBilling, useCancel, useChangePlan, useSubscribe, type Billing } from './billing-api';
import { BillingCopy as Copy, PLAN_LABEL } from './billing-copy';
import { DocumentForm } from './document-form';

const FORBIDDEN = 403;
const CONFLICT = 409;

function onError(error: Error) {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === CONFLICT) notifyError(Copy.documentTaken);
  else notifyError(status === FORBIDDEN ? Copy.forbidden : Copy.failed);
}

/** Spec 05, "Assinatura do SaaS": the plan, the open invoice, subscribe, change, cancel. */
export function BillingScreen() {
  const billing = useBilling();
  return (
    <Screen title={Copy.title}>
      <BackLink to={Route.account} label={AccountCopy.title} />
      {billing.isPending && <ListSkeleton />}
      {billing.isError && (
        <LoadError message={Copy.loadFailed} onRetry={() => void billing.refetch()} />
      )}
      {billing.data && <BillingContent billing={billing.data} />}
    </Screen>
  );
}

function BillingContent({ billing }: Readonly<{ billing: Billing }>) {
  if (!billing.enabled) return <p className="px-4 py-2 text-sm md:px-0">{Copy.off}</p>;
  return (
    <div className="grid gap-8 pt-2 pb-10">
      <section className="grid gap-2 px-4 md:px-0" role="status">
        <p>{Copy.status[billing.status]}</p>
        {billing.endsAt && <p className="text-sm">{Copy.endsAt(billing.endsAt)}</p>}
        {billing.overdueSince && <p className="text-sm">{Copy.overdue}</p>}
        {billing.invoiceUrl && (
          <a className="font-semibold underline" href={billing.invoiceUrl} rel="noreferrer">
            {Copy.payInvoice}
          </a>
        )}
      </section>
      {!billing.documentSet && !billing.subscribed && (
        <div className="px-4 md:px-0">
          <DocumentForm />
        </div>
      )}
      {billing.documentSet && <Plans billing={billing} />}
      {billing.subscribed && <CancelSection />}
    </div>
  );
}

function Plans({ billing }: Readonly<{ billing: Billing }>) {
  const subscribe = useSubscribe();
  const change = useChangePlan();
  const pending = subscribe.isPending || change.isPending;
  const choose = (plan: string) => {
    const action = billing.subscribed ? change : subscribe;
    const done = billing.subscribed ? Copy.planChanged : Copy.subscribed;
    action.mutate(plan, { onSuccess: () => toast.success(done), onError });
  };
  return (
    <section className="grid gap-3 px-4 md:px-0">
      <h2 className="text-lg">{Copy.choosePlan}</h2>
      {billing.subscribed && <p className="text-sm text-muted-foreground">{Copy.changeNote}</p>}
      <ul className="grid gap-3">
        {billing.plans.map((plan) => (
          <li key={plan.id} className="grid gap-1 rounded-xl border bg-card p-4">
            <p className="font-semibold">{PLAN_LABEL[plan.id] ?? plan.id}</p>
            <p className="text-sm tabular-nums">{Copy.price(plan.monthlyCents)}</p>
            <p className="text-sm text-muted-foreground">
              {Copy.planLine(plan.franchise, plan.overageCents)}
            </p>
            {plan.id === billing.plan && billing.subscribed ? (
              <p className="pt-2 text-sm font-semibold">{Copy.current}</p>
            ) : (
              <Button
                className="mt-2 justify-self-start"
                disabled={pending}
                onClick={() => {
                  choose(plan.id);
                }}
              >
                {billing.subscribed ? Copy.change : Copy.subscribe}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function CancelSection() {
  const [asking, setAsking] = useState(false);
  if (asking)
    return (
      <CancelConfirm
        onBack={() => {
          setAsking(false);
        }}
      />
    );
  return (
    <div className="px-4 md:px-0">
      <Button
        variant="outline"
        onClick={() => {
          setAsking(true);
        }}
      >
        {Copy.cancel}
      </Button>
    </div>
  );
}

function CancelConfirm({ onBack }: Readonly<{ onBack: () => void }>) {
  const cancel = useCancel();
  return (
    <div className="grid gap-3 px-4 md:px-0" role="alertdialog" aria-label={Copy.cancel}>
      <p className="text-sm">{Copy.cancelConfirm}</p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={cancel.isPending}
          onClick={() => {
            cancel.mutate(undefined, { onSuccess: () => toast.success(Copy.cancelled), onError });
          }}
        >
          {Copy.cancelYes}
        </Button>
        <Button variant="outline" onClick={onBack}>
          {Copy.cancelNo}
        </Button>
      </div>
    </div>
  );
}
