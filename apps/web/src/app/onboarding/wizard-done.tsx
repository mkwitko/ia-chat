import { Check, Clock, Gauge, ListChecks, MessageCircle, Stethoscope } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Route } from '@/routes';
import { useAvailability } from '../agenda/agenda-api';
import { AssistantSummaryCopy, autonomySummary } from '../assistant/assistant-model';
import { useAssistantSettings } from '../assistant/settings-api';
import { ClinicCopy } from '../clinic/clinic-copy';
import {
  hoursSummary,
  servicesSummary,
  summaryOf,
  TopicStatus,
  whatsappSummary,
} from '../clinic/clinic-model';
import { useProfile } from '../profile/profile-api';
import { SummaryList, type SummaryItem } from '../screens/summary-list';
import { useServices } from '../setup/setup-api';
import { useWhatsappStatus } from '../whatsapp/whatsapp-api';
import { useOnboarding } from './onboarding-api';
import { WizardCopy as Copy } from './wizard-copy';

/** What the setup left in place, one row per answer, each opening the page that changes it. */
function useAreaItem(): SummaryItem {
  const onboarding = useOnboarding().data;
  const area = onboarding?.specialties.find((one) => one.specialty === onboarding.specialty);
  return {
    label: Copy.doneArea,
    to: Route.clinicBusiness,
    icon: Stethoscope,
    summary: area ? { value: area.label, status: TopicStatus.done } : null,
  };
}

function useSummaryItems(): SummaryItem[] {
  const areaItem = useAreaItem();
  const services = useServices();
  const packages = useProfile().data?.profile.packages.length ?? 0;
  const availability = useAvailability();
  const whatsapp = useWhatsappStatus();
  const settings = useAssistantSettings();
  return [
    areaItem,
    {
      label: ClinicCopy.whatsapp,
      to: Route.clinicWhatsapp,
      icon: MessageCircle,
      summary: summaryOf(whatsapp, (data) => whatsappSummary(data.channel)),
    },
    {
      label: ClinicCopy.services,
      to: Route.clinicServices,
      icon: ListChecks,
      summary: summaryOf(services, (data) => servicesSummary(data.services.length, packages)),
    },
    {
      label: ClinicCopy.hours,
      to: Route.clinicHours,
      icon: Clock,
      summary: summaryOf(availability, (data) => hoursSummary(data.rules)),
    },
    {
      label: AssistantSummaryCopy.autonomy,
      to: Route.assistantAutonomy,
      icon: Gauge,
      summary: summaryOf(settings, (data) => autonomySummary(data.autonomy)),
    },
  ];
}

/** The end (round 3): a clear summary of what was set, then the one place to go next. */
export function Done() {
  const items = useSummaryItems();
  return (
    <div className="grid gap-5 pt-4">
      <span className="grid size-14 place-items-center rounded-full bg-jade-soft text-jade-ink">
        <Check className="size-7" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <h1 className="text-2xl">{Copy.doneTitle}</h1>
      <p className="text-base text-muted-foreground">{Copy.doneText}</p>
      <div className="-mx-4 md:mx-0">
        <SummaryList items={items} />
      </div>
      <div className="grid w-full gap-2 sm:flex">
        <Button asChild size="lg">
          <Link to={Route.conversations}>{Copy.doneAction}</Link>
        </Button>
      </div>
    </div>
  );
}
