import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { Route } from '@/routes';

/** Back to the parent screen ("Mais", "Assistente"), 44 px tall. */
export function BackLink({ to, label }: Readonly<{ to: string; label: string }>) {
  return (
    <Link
      to={to}
      // From md the sidebar carries the settings list, so going back to "Mais" is redundant.
      className={cn(
        '-mt-2 mb-2 flex min-h-11 w-fit items-center gap-1 px-4 text-sm font-medium text-muted-foreground hover:text-foreground md:px-0',
        to === Route.more && 'md:hidden',
      )}
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
