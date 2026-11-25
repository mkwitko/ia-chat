import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { MoreCopy } from '@/copy';
import { authClient } from '@/lib/auth-client';
import { Route } from '@/routes';
import { OperatorLink } from '../operator/operator-notices';
import { MoreItemLink } from './more-item-link';
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
              <MoreItemLink
                text={text}
                to={'to' in item ? item.to : undefined}
                helpLink={'helpLink' in item}
              />
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
