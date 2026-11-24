import { CalendarDays, MessageSquare, Sun } from 'lucide-react';
import { EmptyCopy, NavCopy } from '@/copy';
import { EmptyState } from './empty-state';
import { Screen } from './screen';

export function ConversationsScreen() {
  return (
    <Screen title={NavCopy.conversations}>
      <EmptyState icon={MessageSquare} {...EmptyCopy.conversations} />
    </Screen>
  );
}

export function AgendaScreen() {
  return (
    <Screen title={NavCopy.agenda}>
      <EmptyState icon={CalendarDays} {...EmptyCopy.agenda} />
    </Screen>
  );
}

export function TodayScreen() {
  return (
    <Screen title={NavCopy.today}>
      <EmptyState icon={Sun} {...EmptyCopy.today} />
    </Screen>
  );
}
