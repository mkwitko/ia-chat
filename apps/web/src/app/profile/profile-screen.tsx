import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { cn } from '@/lib/utils';
import { Screen, SETTINGS_COLUMNS } from '../screens/screen';
import { CommonCopy } from '../setup/setup-copy';
import { PackagesSection } from './packages-section';
import { PlacesSection } from './places-section';
import { useProfile } from './profile-api';
import { ProfileCopy as Copy } from './profile-copy';
import { ProfileForm } from './profile-form';
import { TeamSection } from './team-section';
import { WelcomeSection } from './welcome-section';

/** M-04 (spec 11): Mais > Perfil do negócio. */
export function ProfileScreen() {
  const profile = useProfile();
  return (
    <Screen title={Copy.title}>
      <BackLink to={Route.more} label={CommonCopy.more} />
      <p className="px-4 pt-2 pb-8 text-sm text-muted-foreground md:px-0">{Copy.intro}</p>
      <div className={cn(SETTINGS_COLUMNS, 'px-4 pb-10 md:px-0')}>
        <div>
          {profile.isPending && <ListSkeleton />}
          {profile.isError && (
            <LoadError message={CommonCopy.loadFailed} onRetry={() => void profile.refetch()} />
          )}
          {profile.data && <ProfileForm initial={profile.data} />}
        </div>
        <div className="grid gap-12">
          <PackagesSection />
          <PlacesSection />
          <TeamSection />
          <WelcomeSection />
        </div>
      </div>
    </Screen>
  );
}
