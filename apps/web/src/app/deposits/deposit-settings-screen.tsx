import { Link } from 'react-router';
import { Route } from '@/routes';
import { FeaturesCopy } from '../features/features-copy';
import { ListSkeleton, LoadError } from '../inbox/query-states';
import { EditorScreen } from '../screens/editor-screen';
import { DepositSettingsForm } from './deposit-settings-form';
import { useDepositSettings } from './deposits-api';
import { DepositsCopy as Copy } from './deposits-copy';

/** Conta › Recursos › Sinal por Pix (H-52): the owner's Pix key and the deposit per service. */
export function DepositSettingsScreen() {
  const view = useDepositSettings();
  return (
    <EditorScreen
      title={Copy.settingsTitle}
      intro={Copy.settingsIntro}
      back={{ to: Route.accountFeatures, label: FeaturesCopy.title }}
    >
      {view.isPending && <ListSkeleton />}
      {view.isError && <LoadError message={Copy.loadFailed} onRetry={() => void view.refetch()} />}
      {view.data && !view.data.feature?.enabled && (
        <p className="text-sm">
          <Link to={Route.accountFeatures} className="font-medium underline underline-offset-4">
            {Copy.featureOff}
          </Link>
        </p>
      )}
      {view.data && <DepositSettingsForm view={view.data} />}
    </EditorScreen>
  );
}
