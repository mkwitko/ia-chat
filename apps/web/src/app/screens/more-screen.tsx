import { MoreCopy } from '@/copy';
import { MoreMenu } from './more-menu';
import { Screen } from './screen';

/** `/mais`: the settings list (on the computer the sidebar carries the same five entries). */
export function MoreScreen() {
  return (
    <Screen title={MoreCopy.title}>
      <div className="md:max-w-2xl">
        <MoreMenu />
      </div>
    </Screen>
  );
}
