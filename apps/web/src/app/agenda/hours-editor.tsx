import { useSearchParams } from 'react-router';
import { Route } from '@/routes';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EditorScreen, SubPages } from '../screens/editor-screen';
import type { MoreRow } from '../screens/more-item-link';
import { ClinicCopy, EditorCopy } from '../clinic/clinic-copy';
import { CommonCopy } from '../setup/setup-copy';
import { useAvailability } from './agenda-api';
import { RulesEditor } from './rules-editor';
import { useProfessionals } from '../profile/profile-api';
import { PROFESSIONAL_PARAM } from './professional-api';
import { ProfessionalFilter } from './professional-controls';
import { ProfessionalCopy } from './professional-copy';

const BACK = { to: Route.clinic, label: ClinicCopy.back };

/** The professional in `?profissional=` (default: the first) and the team to switch between. */
export function useChosenProfessional() {
  const [params, setParams] = useSearchParams();
  const team = useProfessionals().data?.professionals ?? [];
  const asked = params.get(PROFESSIONAL_PARAM);
  const chosen = team.find((one) => one.id === asked) ?? team[0];
  return {
    team,
    chosen,
    choose: (id: string) => {
      setParams({ [PROFESSIONAL_PARAM]: id }, { replace: true });
    },
  };
}

/** The sub page keeps the professional chosen here. */
function withChosen(path: string, { team, chosen }: ReturnType<typeof useChosenProfessional>) {
  if (team.length <= 1 || !chosen) return path;
  return `${path}?${new URLSearchParams({ [PROFESSIONAL_PARAM]: chosen.id }).toString()}`;
}

/** Folgas e férias; with a team, also who does each service. */
function subPagesOf(chooser: ReturnType<typeof useChosenProfessional>): MoreRow[] {
  const timeOff = {
    label: EditorCopy.timeOff,
    hint: EditorCopy.timeOffRow,
    to: withChosen(Route.clinicTimeOff, chooser),
  };
  if (chooser.team.length <= 1) return [timeOff];
  const services = {
    label: EditorCopy.proServices,
    hint: EditorCopy.proServicesRow,
    to: withChosen(Route.clinicProServices, chooser),
  };
  return [timeOff, services];
}

/** Clínica: whose hours or days off this page edits. */
export function TeamSwitch({
  chooser,
}: Readonly<{ chooser: ReturnType<typeof useChosenProfessional> }>) {
  const { team, chosen, choose } = chooser;
  if (team.length <= 1 || !chosen) return null;
  return (
    <div className="-mx-4 md:mx-0">
      <ProfessionalFilter professionals={team} value={chosen.id} onChange={choose} />
    </div>
  );
}

/**
 * Meu consultório › Horários: the week and one "Salvar" (round 3: one task per editor). Days off
 * open on their own page; the nightly summary time moved to Conta › Avisos. With more than one
 * professional (Clínica), each has their own hours and services (spec 05).
 */
export function HoursEditor() {
  const chooser = useChosenProfessional();
  const { chosen } = chooser;
  const availability = useAvailability(chosen?.id);
  const several = chooser.team.length > 1;
  return (
    <EditorScreen title={ClinicCopy.hours} intro={EditorCopy.hoursIntro} back={BACK}>
      <TeamSwitch chooser={chooser} />
      {availability.isPending && <ListSkeleton />}
      {availability.isError && (
        <LoadError message={CommonCopy.loadFailed} onRetry={() => void availability.refetch()} />
      )}
      {availability.data && (
        <section className="grid gap-3">
          {several && chosen && (
            <h2 className="text-lg">{ProfessionalCopy.hoursFor(chosen.name)}</h2>
          )}
          <RulesEditor
            key={chosen?.id}
            initial={availability.data.rules}
            professionalId={chosen?.id}
          />
        </section>
      )}
      <SubPages rows={subPagesOf(chooser)} />
    </EditorScreen>
  );
}
