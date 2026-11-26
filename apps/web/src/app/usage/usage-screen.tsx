import { AccountCopy } from '../account-settings/account-copy';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { EmptyState } from '../screens/empty-state';
import { Screen } from '../screens/screen';
import { CapForm } from './cap-form';
import { useUsage, type Usage } from './usage-api';
import { monthLabel, UsageCopy as Copy } from './usage-copy';
import { UsageBar } from './usage-bar';
import { MetaBlock } from './meta-block';
import { OperatorAccessNotice } from '../operator/operator-notices';

/** Spec 10, "Plano e uso": the month's conversations, overage, owner's cap and Meta cost. */
export function UsageScreen() {
  const usage = useUsage();
  return (
    <Screen title={Copy.title}>
      <BackLink to={Route.account} label={AccountCopy.title} />
      {usage.isPending && <ListSkeleton />}
      {usage.isError && (
        <LoadError message={Copy.loadFailed} onRetry={() => void usage.refetch()} />
      )}
      {usage.data && <UsageContent usage={usage.data} />}
    </Screen>
  );
}

function alertOf({ restricted, full, warning }: Usage): string | null {
  if (restricted) return Copy.restricted;
  if (full) return Copy.full;
  return warning ? Copy.warning : null;
}

function UsageContent({ usage }: Readonly<{ usage: Usage }>) {
  return (
    <div className="grid gap-8 pt-2 pb-10">
      <p className="px-4 text-sm text-muted-foreground md:px-0">
        {Copy.planLine(usage.plan, usage.monthlyCents)} · {monthLabel(usage.month)}
      </p>
      {usage.conversations === 0 ? <EmptyState {...Copy.empty} /> : <Month usage={usage} />}
      <CapForm usage={usage} />
      <OperatorAccessNotice />
      <MetaBlock />
    </div>
  );
}

function Month({ usage }: Readonly<{ usage: Usage }>) {
  const alert = alertOf(usage);
  return (
    <section className="grid gap-4 px-4 md:px-0">
      <UsageBar usage={usage} />
      {alert && (
        <p role="status" className="rounded-lg bg-attention-soft p-3 text-sm">
          {alert}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{Copy.conversationHelp}</p>
      <div className="grid gap-1">
        <h2 className="text-lg">{Copy.overageHeading}</h2>
        <p className="text-sm tabular-nums">
          {usage.overageConversations > 0
            ? Copy.overageLine(usage.overageConversations, usage.overageCents)
            : Copy.overageNone}
        </p>
      </div>
    </section>
  );
}
