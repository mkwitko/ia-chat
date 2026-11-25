import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Route } from '@/routes';
import { useIsOperator, useOwnerGrants } from './operator-api';
import { OperatorCopy as Copy } from './operator-copy';

/** Entry of "Mais" that exists only for platform operators. */
export function OperatorLink() {
  if (!useIsOperator()) return null;
  return (
    <Link
      to={Route.operator}
      className="flex min-h-16 items-center gap-3 border-b px-4 text-base font-semibold hover:bg-muted"
    >
      <span className="flex-1">{Copy.title}</span>
      <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

/** RN-35: the owner sees every platform access to the account, with reason and deadline. */
export function OperatorAccessNotice() {
  const grants = useOwnerGrants();
  if (!grants.data?.length) return null;
  return (
    <section className="grid gap-2 px-4 md:px-0">
      <h2 className="text-lg">{Copy.ownerNotice.heading}</h2>
      <ul className="grid gap-1 text-sm text-muted-foreground">
        {grants.data.map((grant) => (
          <li key={grant.grantedAt}>
            {Copy.ownerNotice.line(
              grant.operatorEmail,
              grant.reason,
              new Date(grant.expiresAt).toLocaleString('pt-BR'),
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
