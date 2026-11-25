import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen, ScreenWidth } from '../screens/screen';
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
    <Screen title={Copy.title} width={ScreenWidth.form}>
      <BackLink to={Route.more} label={CommonCopy.more} />
      <div className="grid gap-12 px-4 pt-2 pb-10 md:px-0">
        <p className="text-sm text-muted-foreground">{Copy.intro}</p>
        {profile.isPending && <ListSkeleton />}
        {profile.isError && (
          <LoadError message={CommonCopy.loadFailed} onRetry={() => void profile.refetch()} />
        )}
        {profile.data && <ProfileForm initial={profile.data} />}
        <PackagesSection />
        <PlacesSection />
        <TeamSection />
        <WelcomeSection />
      </div>
    </Screen>
  );
}
