import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router';

/** Back to the parent screen ("Mais", "Assistente"), 44 px tall. */
export function BackLink({ to, label }: Readonly<{ to: string; label: string }>) {
  return (
    <Link
      to={to}
      className="flex min-h-11 items-center gap-1 px-4 text-sm font-semibold text-primary md:px-0"
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {label}
    </Link>
  );
}
