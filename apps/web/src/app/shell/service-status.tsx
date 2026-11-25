import { Bot, MessageCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Autonomy, useAssistantSettings } from '../assistant/settings-api';
import { useOnboarding } from '../onboarding/onboarding-api';
import { ChannelStatus, useWhatsappStatus } from '../whatsapp/whatsapp-api';

const StatusCopy = {
  label: 'Situação do atendimento',
  notActive: 'Assistente ainda não ativado',
  [Autonomy.approve]: 'Assistente: aprovar antes de enviar',
  [Autonomy.auto]: 'Assistente respondendo',
  [Autonomy.off]: 'Assistente desligado',
  whatsappOn: 'WhatsApp conectado',
  whatsappOff: 'WhatsApp não conectado',
} as const;

const Tone = { assistant: 'assistant', ok: 'ok', idle: 'idle' } as const;
type Tone = (typeof Tone)[keyof typeof Tone];

const DOT: Record<Tone, string> = {
  [Tone.assistant]: 'bg-jade',
  [Tone.ok]: 'bg-ok',
  [Tone.idle]: 'bg-line-strong',
};

function useAssistantLine(): { text: string; tone: Tone } | null {
  const onboarding = useOnboarding().data;
  const settings = useAssistantSettings().data;
  if (!onboarding || !settings) return null;
  if (onboarding.current) return { text: StatusCopy.notActive, tone: Tone.idle };
  const working = settings.autonomy !== Autonomy.off;
  return { text: StatusCopy[settings.autonomy], tone: working ? Tone.assistant : Tone.idle };
}

function useWhatsappLine(): { text: string; tone: Tone } | null {
  const status = useWhatsappStatus().data;
  if (!status) return null;
  const on = status.channel?.status === ChannelStatus.connected;
  return on
    ? { text: StatusCopy.whatsappOn, tone: Tone.ok }
    : { text: StatusCopy.whatsappOff, tone: Tone.idle };
}

/** Sidebar footer: whether the assistant is answering and the WhatsApp is connected, in words. */
export function ServiceStatus() {
  const lines = [
    { icon: Bot, line: useAssistantLine() },
    { icon: MessageCircle, line: useWhatsappLine() },
  ];
  return (
    <ul aria-label={StatusCopy.label} className="grid gap-1.5">
      {lines.map(({ icon, line }) =>
        line ? <Line key={line.text} icon={icon} text={line.text} tone={line.tone} /> : null,
      )}
    </ul>
  );
}

function Line({
  icon: Icon,
  text,
  tone,
}: Readonly<{ icon: LucideIcon; text: string; tone: Tone }>) {
  return (
    <li className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{text}</span>
      <span className={cn('size-2 shrink-0 rounded-full', DOT[tone])} aria-hidden="true" />
    </li>
  );
}
