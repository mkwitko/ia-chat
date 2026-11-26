import {
  CalendarDays,
  Clock,
  ListChecks,
  MapPin,
  MessageCircle,
  Store,
  Users,
  Wallet,
} from 'lucide-react';
import { Route } from '@/routes';
import { useAvailability } from '../agenda/agenda-api';
import { useCalendarStatus } from '../calendar/calendar-api';
import { usePlaces, useProfessionals, useProfile } from '../profile/profile-api';
import type { SummaryItem } from '../screens/summary-list';
import { HelpArticle } from '../screens/screen-help';
import { SummaryScreen } from '../screens/summary-screen';
import { useServices } from '../setup/setup-api';
import { useWhatsappStatus } from '../whatsapp/whatsapp-api';
import { ClinicCopy as Copy } from './clinic-copy';
import {
  addressSummary,
  businessSummary,
  calendarSummary,
  hoursSummary,
  paymentsSummary,
  servicesSummary,
  teamSummary,
  summaryOf,
  whatsappSummary,
} from './clinic-model';

/** Name, services, hours and address: what the assistant tells patients. */
function useAboutItems(): SummaryItem[] {
  const profile = useProfile();
  const services = useServices();
  const places = usePlaces();
  const availability = useAvailability();
  return [
    {
      label: Copy.business,
      to: Route.clinicBusiness,
      icon: Store,
      summary: summaryOf(profile, (data) => businessSummary(data.name, data.profile.description)),
    },
    {
      label: Copy.services,
      to: Route.clinicServices,
      icon: ListChecks,
      summary: summaryOf(services, (data) =>
        servicesSummary(data.services.length, profile.data?.profile.packages.length ?? 0),
      ),
    },
    {
      label: Copy.hours,
      to: Route.clinicHours,
      icon: Clock,
      summary: summaryOf(availability, (data) => hoursSummary(data.rules)),
    },
    {
      label: Copy.address,
      to: Route.clinicAddress,
      icon: MapPin,
      summary: summaryOf(places, (data) =>
        addressSummary(data.locations.map((place) => place.address)),
      ),
    },
  ];
}

/** Who serves, how they are paid, and the WhatsApp and Google Agenda connections. */
function useRunningItems(): SummaryItem[] {
  const profile = useProfile();
  const team = useProfessionals();
  const calendar = useCalendarStatus();
  const whatsapp = useWhatsappStatus();
  return [
    {
      label: Copy.team,
      to: Route.clinicTeam,
      icon: Users,
      summary: summaryOf(team, (data) =>
        teamSummary(data.professionals.map((member) => member.name)),
      ),
    },
    {
      label: Copy.payments,
      to: Route.clinicPayments,
      icon: Wallet,
      summary: summaryOf(profile, (data) =>
        paymentsSummary(data.profile.paymentMethods, data.cancelNoticeMinutes),
      ),
    },
    {
      label: Copy.whatsapp,
      to: Route.clinicWhatsapp,
      icon: MessageCircle,
      summary: summaryOf(whatsapp, (data) => whatsappSummary(data.channel)),
    },
    {
      label: Copy.calendar,
      to: Route.clinicCalendar,
      icon: CalendarDays,
      summary: summaryOf(calendar, calendarSummary),
    },
  ];
}

/** Meu consultório (owner, 26/11/2026): a summary, one row per topic, each opening its editor. */
export function ClinicScreen() {
  const items = [...useAboutItems(), ...useRunningItems()];
  return (
    <SummaryScreen title={Copy.title} intro={Copy.intro} items={items} help={HelpArticle.clinic} />
  );
}
