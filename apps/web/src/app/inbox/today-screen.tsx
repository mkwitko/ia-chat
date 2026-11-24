import { Link } from 'react-router';
import { NavCopy } from '@/copy';
import { Route } from '@/routes';
import { Screen } from '../screens/screen';
import { needsYou } from './conversations-screen';
import { ConversationRow } from './conversation-row';
import { useConversations } from './inbox-api';
import { TodayCopy as Copy } from './inbox-copy';
import { ListSkeleton, LoadError } from './query-states';

/**
 * Spec 10, "Hoje": what needs the professional. The day's appointments come with the agenda
 * (E-19 to E-21); until then the section says so instead of showing nothing.
 */
export function TodayScreen() {
  const conversations = useConversations();
  const waiting = conversations.data?.filter(needsYou) ?? [];
  return (
    <Screen title={NavCopy.today}>
      <h2 className="px-4 pt-2 pb-2 text-base md:px-0">{Copy.attentionTitle}</h2>
      {conversations.isPending && <ListSkeleton />}
      {conversations.isError && (
        <LoadError message={Copy.attentionFailed} onRetry={() => void conversations.refetch()} />
      )}
      {conversations.data && waiting.length === 0 && (
        <p className="px-4 py-3 text-sm text-muted-foreground md:px-0">{Copy.attentionEmpty}</p>
      )}
      {waiting.length > 0 && (
        <ul className="divide-y border-y bg-card md:rounded-xl md:border">
          {waiting.map((item) => (
            <li key={item.id}>
              <ConversationRow item={item} />
            </li>
          ))}
        </ul>
      )}
      <Link
        to={Route.conversations}
        className="flex min-h-11 items-center px-4 text-sm font-semibold text-primary md:px-0"
      >
        {Copy.openAll}
      </Link>
      <h2 className="px-4 pt-6 pb-2 text-base md:px-0">{Copy.todayAppointmentsTitle}</h2>
      <p className="px-4 pb-6 text-sm text-muted-foreground md:px-0">{Copy.appointmentsEmpty}</p>
    </Screen>
  );
}
