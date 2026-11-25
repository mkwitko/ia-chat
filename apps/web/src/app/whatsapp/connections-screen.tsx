import { Route } from '@/routes';
import { CalendarSection } from '../calendar/calendar-section';
import { BackLink } from '../screens/back-link';
import { Screen } from '../screens/screen';
import { WhatsappSection } from './whatsapp-section';

const TITLE = 'Conexões';
const BACK = 'Mais';

/** Spec 10, "Mais > Conexões": WhatsApp and Google Agenda. */
export function ConnectionsScreen() {
  return (
    <Screen title={TITLE}>
      <BackLink to={Route.more} label={BACK} />
      <div className="grid gap-8 pb-10">
        <WhatsappSection />
        <CalendarSection />
      </div>
    </Screen>
  );
}
