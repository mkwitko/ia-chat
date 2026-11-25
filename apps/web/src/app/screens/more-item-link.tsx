import { ChevronRight, ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { HELP_URL } from '@/lib/config';

const ROW = 'flex min-h-16 items-center gap-3 px-4 hover:bg-muted';
const ICON = 'size-5 text-muted-foreground';

interface MoreItemLinkProps {
  text: ReactNode;
  to?: string | undefined;
  /** The help center item: opens the site's help center when HELP_URL is configured. */
  helpLink?: boolean;
}

/** Row of "Mais": internal link, external help link, or plain text while the screen is missing. */
export function MoreItemLink({ text, to, helpLink }: Readonly<MoreItemLinkProps>) {
  if (helpLink && HELP_URL) {
    return (
      <a href={HELP_URL} target="_blank" rel="noreferrer" className={ROW}>
        {text}
        <ExternalLink className={ICON} aria-hidden="true" />
      </a>
    );
  }
  if (!to) return <div className="flex min-h-16 items-center gap-3 px-4">{text}</div>;
  return (
    <Link to={to} className={ROW}>
      {text}
      <ChevronRight className={ICON} aria-hidden="true" />
    </Link>
  );
}
