import { Route } from '@/routes';
import { CalendarConnect } from '../calendar/calendar-section';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { PackagesSection } from '../profile/packages-section';
import { PlacesSection } from '../profile/places-section';
import { TeamSection } from '../profile/team-section';
import { EditorScreen, MoreOptions } from '../screens/editor-screen';
import { ServiceList } from '../setup/service-list';
import { useServices } from '../setup/setup-api';
import { CommonCopy } from '../setup/setup-copy';
import { useQrStatus } from '../whatsapp/qr-api';
import { QrSection } from '../whatsapp/qr-section';
import { WhatsappConnect } from '../whatsapp/whatsapp-section';
import { ClinicCopy, EditorCopy } from './clinic-copy';

// Editors whose items save one by one (a service, an address): no page-wide "Salvar".

const BACK = { to: Route.clinic, label: ClinicCopy.back };

/** Meu consultório › Serviços e preços: the services, then the packages. */
export function ServicesEditor() {
  const services = useServices();
  return (
    <EditorScreen title={ClinicCopy.services} intro={EditorCopy.servicesIntro} back={BACK}>
      {services.isPending && <ListSkeleton />}
      {services.isError && (
        <LoadError message={CommonCopy.loadFailed} onRetry={() => void services.refetch()} />
      )}
      {services.data && (
        <ServiceList
          services={services.data.services}
          pricesForbidden={services.data.pricesForbidden}
        />
      )}
      <div className="border-t pt-6">
        <PackagesSection />
      </div>
    </EditorScreen>
  );
}

export function AddressEditor() {
  return (
    <EditorScreen title={ClinicCopy.address} intro={EditorCopy.addressIntro} back={BACK}>
      <PlacesSection />
    </EditorScreen>
  );
}

export function TeamEditor() {
  return (
    <EditorScreen title={ClinicCopy.team} intro={EditorCopy.teamIntro} back={BACK}>
      <TeamSection />
    </EditorScreen>
  );
}

export function CalendarEditor() {
  return (
    <EditorScreen title={ClinicCopy.calendar} intro={EditorCopy.calendarIntro} back={BACK}>
      <CalendarConnect />
    </EditorScreen>
  );
}

/** The official connection first; the QR code stays folded as the other way (spec 03). */
export function WhatsappEditor() {
  const qr = useQrStatus().data;
  return (
    <EditorScreen title={ClinicCopy.whatsapp} intro={EditorCopy.whatsappIntro} back={BACK}>
      <WhatsappConnect />
      {qr && (qr.available || qr.channel) && (
        <MoreOptions>
          <QrSection />
        </MoreOptions>
      )}
    </EditorScreen>
  );
}
