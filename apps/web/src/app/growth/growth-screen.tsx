import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen, ScreenWidth } from '../screens/screen';
import { CommonCopy } from '../setup/setup-copy';
import { useLeadFollowUp, useReviewRequest } from './growth-api';
import { GrowthCopy as Copy } from './growth-copy';
import { LeadFollowUpSection } from './lead-follow-up-section';
import { ReviewRequestSection } from './review-request-section';

/** M-10 and M-12 (spec 11): Mais > Retorno e avaliações. */
export function GrowthScreen() {
  const followUp = useLeadFollowUp();
  const review = useReviewRequest();
  return (
    <Screen title={Copy.title} width={ScreenWidth.form}>
      <BackLink to={Route.more} label={CommonCopy.more} />
      <div className="grid gap-12 px-4 pt-2 pb-10 md:px-0">
        <p className="text-sm text-muted-foreground">{Copy.intro}</p>
        {(followUp.isPending || review.isPending) && <ListSkeleton />}
        {(followUp.isError || review.isError) && (
          <LoadError
            message={Copy.loadFailed}
            onRetry={() => {
              void followUp.refetch();
              void review.refetch();
            }}
          />
        )}
        {followUp.data && <LeadFollowUpSection view={followUp.data} />}
        {review.data && <ReviewRequestSection view={review.data} />}
      </div>
    </Screen>
  );
}
