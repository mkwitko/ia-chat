import { Check, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { conversationPath } from '@/routes';
import { InboxState, useConversations, type ConversationSummary } from '../inbox/inbox-api';
import { useWhatsappStatus } from '../whatsapp/whatsapp-api';

const Copy = defineMessages({
  [Locale.ptBR]: {
    sendTo: 'Mande para este número:',
    noNumber:
      'O WhatsApp ainda não está conectado. Conecte em Meu consultório › WhatsApp e volte aqui, ou toque em "Pular por agora".',
    waiting: 'Esperando a sua mensagem…',
    arrived: 'Chegou!',
    from: (who: string, text: string) => `${who}: “${text}”`,
    noText: 'mensagem sem texto',
    awaiting: 'O assistente já escreveu a resposta. Ela espera você tocar em Enviar.',
    answered: 'O assistente já está cuidando da conversa.',
    open: 'Abrir a conversa',
  },
  [Locale.enUS]: {},
});

const POLL_MS = 4000;

/** The first conversation that got a message after the screen opened. */
function arrivedAfter(list: readonly ConversationSummary[], since: number) {
  return list.find((item) => item.lastMessage && Date.parse(item.lastMessage.at) >= since);
}

/** Round 3 (owner, 26/11/2026): the owner texts their own number and watches it arrive, live. */
export function LiveTest() {
  const [since] = useState(() => Date.now());
  const phone = useWhatsappStatus().data?.channel?.displayPhone ?? null;
  const conversations = useConversations();
  const found = arrivedAfter(conversations.data ?? [], since);
  const { refetch } = conversations;
  // The inbox events refresh the list too; the poll covers a dropped connection.
  useEffect(() => {
    if (found) return undefined;
    const timer = setInterval(() => void refetch(), POLL_MS);
    return () => {
      clearInterval(timer);
    };
  }, [found, refetch]);
  if (!phone) return <p className="text-base">{Copy.noNumber}</p>;
  return (
    <div className="grid gap-5">
      <div className="grid gap-1 rounded-xl border bg-card p-4">
        <span className="text-sm text-muted-foreground">{Copy.sendTo}</span>
        <span className="text-xl font-semibold whitespace-nowrap tabular-nums sm:text-2xl">
          {phone}
        </span>
      </div>
      {found ? <Arrived item={found} /> : <Waiting />}
    </div>
  );
}

function Waiting() {
  return (
    <p role="status" className="flex items-center gap-3 text-base text-muted-foreground">
      <LoaderCircle className="size-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      {Copy.waiting}
    </p>
  );
}

function Arrived({ item }: Readonly<{ item: ConversationSummary }>) {
  const who = item.name ?? item.phone ?? '';
  const text = item.lastMessage?.text ?? Copy.noText;
  return (
    <section role="status" className="grid gap-3 rounded-xl border border-jade/30 bg-jade-soft p-4">
      <p className="flex items-center gap-2 font-semibold">
        <Check className="size-5 text-jade-ink" strokeWidth={2.5} aria-hidden="true" />
        {Copy.arrived}
      </p>
      <p className="text-pretty">{Copy.from(who, text)}</p>
      <p className="text-sm text-muted-foreground">
        {item.state === InboxState.awaitingApproval ? Copy.awaiting : Copy.answered}
      </p>
      <Link
        to={conversationPath(item.id)}
        className="flex min-h-11 w-fit items-center font-semibold underline underline-offset-4"
      >
        {Copy.open}
      </Link>
    </section>
  );
}
