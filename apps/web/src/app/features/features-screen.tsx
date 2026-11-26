import { Route } from '@/routes';
import { AccountCopy } from '../account-settings/account-copy';
import { PLAN_LABEL } from '../billing/billing-copy';
import { SwitchRow } from '../growth/switch-row';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EditorScreen } from '../screens/editor-screen';
import { feedback } from '../setup/feedback';
import { useFeatures, useSaveFeature, type FeatureState } from './features-api';
import { FeaturesCopy as Copy } from './features-copy';

/** Conta › Recursos (H-51): one switch per feature; outside the plan, the plan that has it. */
export function FeaturesScreen() {
  const features = useFeatures();
  return (
    <EditorScreen
      title={Copy.title}
      intro={Copy.intro}
      back={{ to: Route.account, label: AccountCopy.title }}
    >
      {features.isPending && <ListSkeleton />}
      {features.isError && (
        <LoadError message={Copy.loadFailed} onRetry={() => void features.refetch()} />
      )}
      {features.data && (
        <ul className="grid gap-5">
          {features.data.features.map((state) => (
            <li key={state.feature}>
              <FeatureRow state={state} />
            </li>
          ))}
        </ul>
      )}
    </EditorScreen>
  );
}

function FeatureRow({ state }: Readonly<{ state: FeatureState }>) {
  const save = useSaveFeature();
  const text = Copy.items[state.feature];
  const hint = state.included
    ? text.hint
    : `${text.hint} ${Copy.inPlan(PLAN_LABEL[state.plan] ?? state.plan)}.`;
  return (
    <SwitchRow
      id={`feature-${state.feature}`}
      label={text.label}
      hint={hint}
      checked={state.enabled}
      disabled={!state.included || save.isPending}
      onChange={(enabled) => {
        save.mutate({ feature: state.feature, enabled }, feedback);
      }}
    />
  );
}
