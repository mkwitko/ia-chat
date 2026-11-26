import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EditorScreen } from '../screens/editor-screen';
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
    <EditorScreen
      title={Copy.title}
      intro={Copy.intro}
      back={{ to: Route.assistant, label: CommonCopy.assistant }}
    >
      <div className="grid gap-12">
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
    </EditorScreen>
  );
}
