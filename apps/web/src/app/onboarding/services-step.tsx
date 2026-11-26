import { ListSkeleton, LoadError } from '../inbox/query-states';
import { PackagesSection } from '../profile/packages-section';
import { useServices } from '../setup/setup-api';
import { CommonCopy } from '../setup/setup-copy';
import { ServiceList } from '../setup/service-list';
import type { OnboardingView } from './onboarding-api';
import { Templates } from './templates-card';

/** Step 3: the area's examples on request, the services (with what the review saved) and packages. */
export function ServicesStep({ view }: Readonly<{ view: OnboardingView }>) {
  const services = useServices();
  return (
    <div className="grid gap-8">
      {view.specialty && <Templates pricesForbidden={view.pricesForbidden} />}
      <div>
        {services.isPending && <ListSkeleton />}
        {services.isError && (
          <LoadError message={CommonCopy.loadFailed} onRetry={() => void services.refetch()} />
        )}
        {services.data && (
          <ServiceList
            services={services.data.services}
            pricesForbidden={services.data.pricesForbidden}
          />
        )}
      </div>
      <PackagesSection />
    </div>
  );
}
