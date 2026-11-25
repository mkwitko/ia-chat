import { NavLink } from 'react-router';
import { Route } from '@/routes';
import { TrialCopy as Copy } from './trial-copy';
import { TrialPhase, useTrial } from './trial-api';

/** A strip under the alerts: days left in the trial, or what to do after it ended (RF-88). */
export function TrialBanner() {
  const trial = useTrial().data;
  if (!trial || trial.phase === TrialPhase.none) return null;
  const ended = trial.phase === TrialPhase.ended;
  return (
    <div
      role={ended ? 'alert' : 'status'}
      className={`flex items-center justify-between gap-3 px-4 py-1 text-sm ${ended ? 'bg-danger-soft' : 'bg-muted'}`}
    >
      <span>
        {ended ? `${Copy.ended(trial.dataKeptUntil)} ${Copy.next}` : Copy.active(trial.daysLeft)}
      </span>
      <NavLink to={Route.usage} className="shrink-0 py-3 font-semibold underline">
        {Copy.action}
      </NavLink>
    </div>
  );
}
