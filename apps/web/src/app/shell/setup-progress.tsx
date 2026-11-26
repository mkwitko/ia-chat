import { ChevronRight } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';
import { cn } from '@/lib/utils';
import { Route } from '@/routes';
import { useOnboarding } from '../onboarding/onboarding-api';
import { STEP_INFO } from '../onboarding/onboarding-copy';
import { ProgressBar } from '../screens/progress-bar';
import { progressOf, type SetupProgress } from './setup-model';

export const SetupCopy = {
  label: (done: number, total: number) => `Primeiros passos · ${String(done)} de ${String(total)}`,
  next: 'Próximo passo',
  continue: 'Continuar configuração',
} as const;

/** Unfinished setup, or null once every step is settled (and while it loads). */
export function useSetupProgress(): SetupProgress | null {
  const data = useOnboarding().data;
  return data ? progressOf(data, (step) => STEP_INFO[step].title) : null;
}

/** The card and the strip step aside on "Meu consultório", which shows its own count. */
function useShownProgress(): SetupProgress | null {
  const progress = useSetupProgress();
  return useLocation().pathname.startsWith(Route.clinic) ? null : progress;
}

const linkState = ({ isActive }: { isActive: boolean }) =>
  cn(
    'grid gap-2 rounded-lg border bg-card p-3 shadow-card transition-colors hover:border-line-strong',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
    isActive && 'border-line-strong',
  );

/** Desktop sidebar: "Configuração · X de N", the bar and the step that is next. */
export function SetupProgressCard() {
  const progress = useShownProgress();
  if (!progress) return null;
  const label = SetupCopy.label(progress.done, progress.total);
  return (
    <NavLink to={Route.onboarding} className={linkState}>
      <span className="text-xs font-semibold">{label}</span>
      <ProgressBar value={progress.done} total={progress.total} label={label} />
      <span className="truncate text-xs text-muted-foreground">{progress.currentTitle}</span>
    </NavLink>
  );
}

/** Phone: a thin strip under the alerts while setup is unfinished. */
export function SetupStrip() {
  const progress = useShownProgress();
  if (!progress) return null;
  const label = SetupCopy.label(progress.done, progress.total);
  return (
    <NavLink
      to={Route.onboarding}
      className="flex min-h-11 items-center gap-3 border-b bg-card px-4 md:hidden"
    >
      <span className="shrink-0 text-xs font-semibold">{label}</span>
      <ProgressBar
        value={progress.done}
        total={progress.total}
        label={label}
        className="min-w-0 flex-1"
      />
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </NavLink>
  );
}
