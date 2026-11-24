import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { MoreCopy } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
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
        {MoreCopy.items.map((item) => (
          <li key={item.label} className="flex min-h-16 items-center gap-3 px-4">
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold">{item.label}</p>
              <p className="truncate text-sm text-muted-foreground">{item.hint}</p>
            </div>
          </li>
        ))}
      </ul>
      <div className="px-4 py-6 md:px-0">
        <Button variant="outline" onClick={() => void signOut()}>
          {MoreCopy.signOut}
        </Button>
      </div>
    </Screen>
  );
}
