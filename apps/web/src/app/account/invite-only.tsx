import { Button } from '@/components/ui/button';
import { WAITLIST_URL } from '@/lib/config';
import { Route } from '@/routes';
import { AccountCopy, InviteCopy as Copy } from './account-copy';
import { AuthFrame } from './auth-frame';

/** H-37: sign-up is invite-only. Says why, and points to the waitlist on the public site. */
export function InviteOnly({ message = Copy.closedBody }: Readonly<{ message?: string }>) {
  return (
    <AuthFrame
      title={Copy.closedTitle}
      footer={{ to: Route.login, label: AccountCopy.backToLogin }}
    >
      <p>{message}</p>
      {WAITLIST_URL && (
        <Button asChild>
          <a href={WAITLIST_URL}>{Copy.waitlist}</a>
        </Button>
      )}
    </AuthFrame>
  );
}
