import { Route } from '@/routes';
import { CalendarSection } from '../calendar/calendar-section';
import { BackLink } from '../screens/back-link';
<<<<<<< HEAD
import { Screen, ScreenWidth } from '../screens/screen';
import { QrSection } from './qr-section';
=======
import { cn } from '@/lib/utils';
import { Screen, SETTINGS_COLUMNS } from '../screens/screen';
>>>>>>> origin/main
import { WhatsappSection } from './whatsapp-section';

const TITLE = 'Conexões';
const BACK = 'Mais';

/** Spec 10, "Mais > Conexões": WhatsApp (official first, QR code as the alternative) and Google Agenda. */
export function ConnectionsScreen() {
  return (
    <Screen title={TITLE}>
      <BackLink to={Route.more} label={BACK} />
      <div className={cn(SETTINGS_COLUMNS, 'pb-10')}>
        <WhatsappSection />
        <QrSection />
        <CalendarSection />
      </div>
    </Screen>
  );
}
