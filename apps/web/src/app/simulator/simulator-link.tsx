import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Route } from '@/routes';

const LABEL = 'Testar no simulador';

/** Next step of an empty screen before the first patient: try the assistant without sending. */
export function SimulatorLink() {
  return (
    <Button asChild variant="outline">
      <Link to={Route.simulator}>{LABEL}</Link>
    </Button>
  );
}
