import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Route } from '@/routes';
import { ProgressBar } from '../screens/progress-bar';
import { SetupCopy, useSetupProgress } from '../shell/setup-progress';

/** Início while setup is unfinished: the step that is next and one button to it. */
export function NextStepCard() {
  const progress = useSetupProgress();
  if (!progress) return null;
  const label = SetupCopy.label(progress.done, progress.total);
  return (
    <section
      aria-labelledby="next-step"
      className="mx-4 mb-8 grid gap-4 rounded-xl border bg-card p-5 shadow-card md:mx-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-x-8"
    >
      <div className="grid gap-3">
        <h2 id="next-step" className="text-lg">
          {SetupCopy.next}: {progress.currentTitle}
        </h2>
        <div className="flex items-center gap-3">
          <ProgressBar
            value={progress.done}
            total={progress.total}
            label={label}
            className="max-w-64 flex-1"
          />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </div>
      <Button asChild className="justify-self-start">
        <Link to={Route.onboarding}>{SetupCopy.continue}</Link>
      </Button>
    </section>
  );
}
