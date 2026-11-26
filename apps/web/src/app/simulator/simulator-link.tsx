import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Route } from '@/routes';

const Copy = defineMessages({
  [Locale.ptBR]: { label: 'Testar o assistente' },
  [Locale.enUS]: {},
});

/** Next step of an empty screen before the first patient: try the assistant without sending. */
export function SimulatorLink() {
  return (
    <Button asChild variant="outline">
      <Link to={Route.simulator}>{Copy.label}</Link>
    </Button>
  );
}
