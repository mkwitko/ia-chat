import { useNavigate } from 'react-router';
import { AlertCopy } from '@/copy';
import { Route } from '@/routes';
import { useOnboarding } from '../onboarding/onboarding-api';
import type { ServiceAlert } from './alert-bar';
import { useWhatsappConnected } from './service-status';
import { TrialCopy } from './trial-copy';
import { TrialPhase, useTrial } from './trial-api';
import { useCalendarAlert } from './use-calendar-alert';
import { usePushAlert } from './use-push-alert';

function useWhatsappAlert(): ServiceAlert | null {
  const connected = useWhatsappConnected();
  const setupDone = useOnboarding().data?.current === null;
  const navigate = useNavigate();
  if (connected !== false || !setupDone) return null;
  return {
    message: AlertCopy.whatsappDisconnected,
    action: AlertCopy.reconnect,
    onAction: () => void navigate(Route.clinicWhatsapp),
  };
}

function useTrialAlert(): ServiceAlert | null {
  const trial = useTrial().data;
  const navigate = useNavigate();
  if (trial?.phase !== TrialPhase.ended) return null;
  return {
    message: TrialCopy.ended(trial.dataKeptUntil),
    action: TrialCopy.action,
    onAction: () => void navigate(Route.usage),
  };
}

/** What stops the service, most serious first. The panel shows only the first one. */
export function useServiceAlerts(): ServiceAlert[] {
  const alerts = [useTrialAlert(), useWhatsappAlert(), useCalendarAlert(), usePushAlert()];
  return alerts.filter((alert): alert is ServiceAlert => alert !== null);
}
