import { Route } from '@/routes';
import { ClinicCopy, EditorCopy } from '../clinic/clinic-copy';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EditorScreen } from '../screens/editor-screen';
import { CommonCopy } from '../setup/setup-copy';
import { useAvailability } from './agenda-api';
import { TeamSwitch, useChosenProfessional } from './hours-editor';
import { ProfessionalServices } from './professional-services';
import { TimeOffSection } from './time-off-section';

// Pages under Meu consultório › Horários (round 3: one task per editor).

const BACK = { to: Route.clinicHours, label: ClinicCopy.hours };

/** Horários › Folgas e férias: blocks and vacations on their own page. */
export function TimeOffEditor() {
  const chooser = useChosenProfessional();
  const professionalId = chooser.chosen?.id;
  // The time offs are shown in the tenant's zone, which comes with the availability.
  const availability = useAvailability(professionalId);
  return (
    <EditorScreen title={EditorCopy.timeOff} intro={EditorCopy.timeOffIntro} back={BACK}>
      <TeamSwitch chooser={chooser} />
      {availability.isPending && <ListSkeleton />}
      {availability.isError && (
        <LoadError message={CommonCopy.loadFailed} onRetry={() => void availability.refetch()} />
      )}
      {availability.data && (
        <TimeOffSection
          titled={false}
          timezone={availability.data.timezone}
          professionalId={professionalId}
        />
      )}
    </EditorScreen>
  );
}

/** Horários › Quem faz cada serviço (Clínica): the services of the chosen professional. */
export function ProServicesEditor() {
  const chooser = useChosenProfessional();
  const { chosen } = chooser;
  return (
    <EditorScreen title={EditorCopy.proServices} back={BACK}>
      <TeamSwitch chooser={chooser} />
      {chosen && <ProfessionalServices key={chosen.id} professionalId={chosen.id} />}
    </EditorScreen>
  );
}
