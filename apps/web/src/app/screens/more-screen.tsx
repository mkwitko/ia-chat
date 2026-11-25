import { ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { MoreCopy } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { OperatorLink } from '../operator/operator-notices';
import { Screen } from './screen';

/** "Mais": settings out of the daily path (RN-52). Items become links as their screens land. */
export function MoreScreen() {
  const navigate = useNavigate();
  async function signOut() {
    await authClient.signOut();
    void navigate(Route.login, { replace: true });
  }
  return (
    <Screen title={MoreCopy.title}>
      <ul className="divide-y border-y bg-card md:rounded-xl md:border">
        {MoreCopy.items.map((item) => {
          const text = (
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold">{item.label}</p>
              <p className="truncate text-sm text-muted-foreground">{item.hint}</p>
            </div>
          );
          return (
            <li key={item.label}>
              {'to' in item ? (
                <Link to={item.to} className="flex min-h-16 items-center gap-3 px-4 hover:bg-muted">
                  {text}
                  <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
                </Link>
              ) : (
                <div className="flex min-h-16 items-center gap-3 px-4">{text}</div>
              )}
            </li>
          );
        })}
      </ul>
      <OperatorLink />
      <div className="px-4 py-6 md:px-0">
        <Button variant="outline" onClick={() => void signOut()}>
          {MoreCopy.signOut}
        </Button>
      </div>
    </Screen>
  );
}
