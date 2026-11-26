import { Route } from '@/routes';
import { CalendarSection } from '../calendar/calendar-section';
import { BackLink } from '../screens/back-link';
import { Screen, ScreenWidth } from '../screens/screen';
import { QrSection } from './qr-section';
import { WhatsappSection } from './whatsapp-section';

const TITLE = 'Conexões';
const BACK = 'Mais';

/** Spec 10, "Mais > Conexões": WhatsApp (official first, QR code as the alternative) and Google Agenda. */
export function ConnectionsScreen() {
  return (
    <Screen title={TITLE} width={ScreenWidth.form}>
      <BackLink to={Route.more} label={BACK} />
      <div className="grid gap-8 pb-10">
        <WhatsappSection />
        <QrSection />
        <CalendarSection />
      </div>
    </Screen>
  );
}
