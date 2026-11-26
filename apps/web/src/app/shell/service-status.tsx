import { Bot, Clock, MessageCircle, type LucideIcon } from 'lucide-react';
import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { cn } from '@/lib/utils';
import { Autonomy, useAssistantSettings } from '../assistant/settings-api';
import { useOnboarding } from '../onboarding/onboarding-api';
import { useQrStatus } from '../whatsapp/qr-api';
import { ChannelStatus, useWhatsappStatus } from '../whatsapp/whatsapp-api';
import { TrialPhase, useTrial } from './trial-api';

export const StatusCopy = defineMessages({
  [Locale.ptBR]: {
    label: 'Situação do atendimento',
    notActive: 'Assistente ainda não ativado',
    [Autonomy.approve]: 'Assistente: você aprova antes de enviar',
    [Autonomy.auto]: 'Assistente respondendo',
    [Autonomy.off]: 'Assistente desligado',
    whatsappOn: 'WhatsApp conectado',
    whatsappOff: 'WhatsApp não conectado',
    trial: (days: number) =>
      days === 1 ? 'Teste grátis: falta 1 dia' : `Teste grátis: faltam ${String(days)} dias`,
    trialEnded: 'Teste grátis terminou',
  },
  [Locale.enUS]: {},
});

export const Tone = { assistant: 'assistant', ok: 'ok', idle: 'idle', problem: 'problem' } as const;
export type Tone = (typeof Tone)[keyof typeof Tone];

export interface StatusLine {
  icon: LucideIcon;
  text: string;
  tone: Tone;
}

const DOT: Record<Tone, string> = {
  [Tone.assistant]: 'bg-jade',
  [Tone.ok]: 'bg-ok',
  [Tone.idle]: 'bg-line-strong',
  [Tone.problem]: 'bg-danger',
};

function useAssistantLine(): StatusLine | null {
  const onboarding = useOnboarding().data;
  const settings = useAssistantSettings().data;
  if (!onboarding || !settings) return null;
  if (onboarding.current) return { icon: Bot, text: StatusCopy.notActive, tone: Tone.idle };
  const working = settings.autonomy !== Autonomy.off;
  return {
    icon: Bot,
    text: StatusCopy[settings.autonomy],
    tone: working ? Tone.assistant : Tone.problem,
  };
}

/** True, false, or null while it loads. */
export function useWhatsappConnected(): boolean | null {
  const status = useWhatsappStatus().data;
  const qr = useQrStatus().data;
  if (!status) return null;
  return [status.channel, qr?.channel].some((one) => one?.status === ChannelStatus.connected);
}

function useWhatsappLine(): StatusLine | null {
  const on = useWhatsappConnected();
  if (on === null) return null;
  return on
    ? { icon: MessageCircle, text: StatusCopy.whatsappOn, tone: Tone.ok }
    : { icon: MessageCircle, text: StatusCopy.whatsappOff, tone: Tone.idle };
}

function useTrialLine(): StatusLine | null {
  const trial = useTrial().data;
  if (!trial || trial.phase === TrialPhase.none) return null;
  if (trial.phase === TrialPhase.ended)
    return { icon: Clock, text: StatusCopy.trialEnded, tone: Tone.problem };
  return { icon: Clock, text: StatusCopy.trial(trial.daysLeft), tone: Tone.idle };
}

/** The three facts of the service, in words: assistant, WhatsApp, trial. */
export function useStatusLines(): StatusLine[] {
  const lines = [useAssistantLine(), useWhatsappLine(), useTrialLine()];
  return lines.filter((line): line is StatusLine => line !== null);
}

/** Sidebar footer and Início's status card: the same lines, the same look. */
export function ServiceStatus({
  className,
  inline = false,
}: Readonly<{ className?: string; inline?: boolean }>) {
  const lines = useStatusLines();
  return (
    <ul aria-label={StatusCopy.label} className={cn('grid gap-1.5', className)}>
      {lines.map((line) => (
        <Line key={line.text} line={line} inline={inline} />
      ))}
    </ul>
  );
}

function Line({
  line: { icon: Icon, text, tone },
  inline,
}: Readonly<{ line: StatusLine; inline: boolean }>) {
  return (
    <li className="flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className={cn('min-w-0 truncate', !inline && 'flex-1')}>{text}</span>
      <span className={cn('size-2 shrink-0 rounded-full', DOT[tone])} aria-hidden="true" />
    </li>
  );
}
