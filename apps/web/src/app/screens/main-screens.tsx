import { CalendarDays } from 'lucide-react';
import { EmptyCopy, NavCopy } from '@/copy';
import { EmptyState } from './empty-state';
import { Screen } from './screen';

export function AgendaScreen() {
  return (
    <Screen title={NavCopy.agenda}>
      <EmptyState icon={CalendarDays} {...EmptyCopy.agenda} />
    </Screen>
  );
}
