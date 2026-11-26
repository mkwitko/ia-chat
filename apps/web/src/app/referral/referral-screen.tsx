import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { BackLink } from '../screens/back-link';
import { Screen, ScreenWidth } from '../screens/screen';
import { AccountCopy } from '../account-settings/account-copy';
import { ReferralCopy as Copy } from './referral-copy';

// Mirrors GET /api/growth/referral (the web does not import server code).
const PATH = '/api/growth/referral';

interface ReferralView {
  code: string;
  link: string;
  signups: number;
}

/** M-11 (spec 11, "Modelo de indicação"): Mais > Indique e ganhe. The owner shares the link. */
export function ReferralScreen() {
  const referral = useQuery({ queryKey: [PATH], queryFn: () => api<ReferralView>(PATH) });
  return (
    <Screen title={Copy.title} width={ScreenWidth.form}>
      <BackLink to={Route.account} label={AccountCopy.title} />
      <div className="grid gap-8 px-4 pt-2 pb-10 md:px-0">
        <p className="text-sm text-muted-foreground">{Copy.intro}</p>
        {referral.isPending && <ListSkeleton />}
        {referral.isError && (
          <LoadError message={Copy.loadFailed} onRetry={() => void referral.refetch()} />
        )}
        {referral.data && <ReferralBody view={referral.data} />}
      </div>
    </Screen>
  );
}

function ReferralBody({ view }: Readonly<{ view: ReferralView }>) {
  return (
    <>
      <LinkSection view={view} />
      <section className="grid gap-2" aria-labelledby="referral-count">
        <h2 id="referral-count" className="text-lg">
          {Copy.countHeading}
        </h2>
        <p className="text-sm">{Copy.signups(view.signups)}</p>
        <p className="text-sm text-muted-foreground">{Copy.noMessages}</p>
        <p className="text-sm text-muted-foreground">{Copy.reward}</p>
      </section>
    </>
  );
}

function LinkSection({ view }: Readonly<{ view: ReferralView }>) {
  const copy = () => {
    navigator.clipboard.writeText(view.link).then(
      () => toast.success(Copy.copied),
      () => notifyError(Copy.copyFailed),
    );
  };
  return (
    <section className="grid gap-2" aria-labelledby="referral-link">
      <h2 id="referral-link" className="text-lg">
        {Copy.linkHeading}
      </h2>
      <Label htmlFor="referral-link-field">{Copy.linkLabel}</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="referral-link-field"
          readOnly
          value={view.link}
          className="min-w-0 flex-1 basis-64"
          onFocus={(event) => {
            event.currentTarget.select();
          }}
        />
        <Button type="button" onClick={copy}>
          {Copy.copy}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {Copy.codeLabel}: <span className="font-medium text-foreground">{view.code}</span>
      </p>
    </section>
  );
}
