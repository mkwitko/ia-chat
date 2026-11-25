import { ChevronLeft } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router';
import { LoadingCopy } from '@/copy';
import { ApiError } from '@/lib/api';
import { Route } from '@/routes';
import { Composer } from './composer';
import { ControlBar } from './control-bar';
import { displayName } from './conversation-row';
import { DraftCard } from './draft-card';
import { useConversation, useMarkRead, type ConversationDetail } from './inbox-api';
import { ConversationCopy as Copy } from './inbox-copy';
import { LoadError } from './query-states';
import { StateBadge } from './state-badge';
import { Timeline } from './timeline';

const NOT_FOUND = 404;

/** Spec 10, "Conversa": messages, control bar, draft for approval and the composer. */
export function ConversationScreen() {
  const { id = '' } = useParams();
  const conversation = useConversation(id);
  const notFound =
    conversation.error instanceof ApiError && conversation.error.status === NOT_FOUND;
  return (
    <section className="flex h-full w-full flex-col bg-background">
      <Header detail={conversation.data} />
      {conversation.isPending && (
        <p role="status" className="px-4 py-6 text-muted-foreground">
          {LoadingCopy}
        </p>
      )}
      {conversation.isError && (
        <LoadError
          message={notFound ? Copy.notFound : Copy.loadFailed}
          onRetry={() => void conversation.refetch()}
        />
      )}
      {conversation.data && <Body detail={conversation.data} />}
    </section>
  );
}

function Header({ detail }: Readonly<{ detail: ConversationDetail | undefined }>) {
  return (
    <header className="flex min-h-14 items-center gap-2 border-b bg-card px-2 py-1 md:px-4 lg:px-6">
      <Link
        to={Route.conversations}
        aria-label={Copy.back}
        className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-muted lg:hidden"
      >
        <ChevronLeft className="size-6" aria-hidden="true" />
      </Link>
      {detail && (
        <>
          <h1 className="min-w-0 flex-1 truncate text-lg">{displayName(detail)}</h1>
          <StateBadge state={detail.state} />
        </>
      )}
    </header>
  );
}

function Body({ detail }: Readonly<{ detail: ConversationDetail }>) {
  const markRead = useMarkRead(detail.id);
  const { mutate } = markRead;
  const unread = detail.unreadCount;
  useEffect(() => {
    if (unread > 0) mutate();
  }, [unread, mutate]);
  const end = useRef<HTMLDivElement>(null);
  const count = detail.messages.length;
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [count]);
  return (
    <>
      <ControlBar conversationId={detail.id} control={detail.control} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Timeline messages={detail.messages} events={detail.events} />
        <div ref={end} />
      </div>
      {detail.draft && (
        <DraftCard key={detail.draft.turnId} conversationId={detail.id} draft={detail.draft} />
      )}
      <Composer conversationId={detail.id} />
    </>
  );
}
