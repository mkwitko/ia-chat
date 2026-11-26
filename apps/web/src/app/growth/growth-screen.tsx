import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen, ScreenWidth } from '../screens/screen';
import { CommonCopy } from '../setup/setup-copy';
import { useLeadFollowUp } from './growth-api';
import { GrowthCopy as Copy } from './growth-copy';
import { LeadFollowUpSection } from './lead-follow-up-section';

/** M-10 (spec 11): Mais > Retorno de clientes. */
export function GrowthScreen() {
  const followUp = useLeadFollowUp();
  return (
    <Screen title={Copy.title} width={ScreenWidth.form}>
      <BackLink to={Route.more} label={CommonCopy.more} />
      <div className="grid gap-12 px-4 pt-2 pb-10 md:px-0">
        <p className="text-sm text-muted-foreground">{Copy.intro}</p>
        {followUp.isPending && <ListSkeleton />}
        {followUp.isError && (
          <LoadError message={Copy.loadFailed} onRetry={() => void followUp.refetch()} />
        )}
        {followUp.data && <LeadFollowUpSection view={followUp.data} />}
      </div>
    </Screen>
  );
}
