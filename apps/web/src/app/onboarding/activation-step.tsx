import { Bell, Check, Download } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePushState, usePushSubscribe } from '@/lib/push';
import type { OnboardingView } from './onboarding-api';
import { OnboardingCopy } from './onboarding-copy';

export const ActivationCopy = {
  phoneHeading: 'No seu celular',
  install: 'Instalar o painel na tela inicial',
  installHint:
    'Abre como um app e recebe avisos. No iPhone: Compartilhar > Adicionar à Tela de Início.',
  installed: 'Painel instalado',
  notify: 'Permitir notificações',
  notifyHint: 'Para saber na hora quando um rascunho espera sua aprovação ou alguém pede você.',
  notifyOn: 'Notificações ligadas neste aparelho',
  notifyBlocked: 'Notificações bloqueadas no navegador. Libere nas configurações do site.',
} as const;

interface InstallPrompt extends Event {
  prompt: () => Promise<void>;
}
const BEFORE_INSTALL = 'beforeinstallprompt';
const STANDALONE = '(display-mode: standalone)';

/** Chrome's install prompt, kept for a tap; null where the browser has none (iPhone). */
function useInstallPrompt() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  useEffect(() => {
    const keep = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    window.addEventListener(BEFORE_INSTALL, keep);
    return () => {
      window.removeEventListener(BEFORE_INSTALL, keep);
    };
  }, []);
  return prompt;
}

/** Step 6: "aprovar antes de enviar", the PWA on the home screen and the notifications. */
export function ActivationStep({ view }: Readonly<{ view: OnboardingView }>) {
  return (
    <div className="grid gap-6">
      {!view.whatsappConnected && (
        <p className="rounded-lg bg-attention-soft px-3 py-2 text-sm">
          {OnboardingCopy.activationNeedsWhatsapp}
        </p>
      )}
      <section className="grid gap-4" aria-labelledby="phone-heading">
        <h3 id="phone-heading" className="font-semibold">
          {ActivationCopy.phoneHeading}
        </h3>
        <InstallRow />
        <NotifyRow />
      </section>
    </div>
  );
}

function InstallRow() {
  const prompt = useInstallPrompt();
  const installed = window.matchMedia(STANDALONE).matches;
  return (
    <div className="grid gap-1">
      {installed ? (
        <Done text={ActivationCopy.installed} />
      ) : (
        <Button
          variant="outline"
          className="justify-self-start"
          disabled={!prompt}
          onClick={() => void prompt?.prompt()}
        >
          <Download aria-hidden="true" />
          {ActivationCopy.install}
        </Button>
      )}
      {!installed && <p className="text-sm text-muted-foreground">{ActivationCopy.installHint}</p>}
    </div>
  );
}

function NotifyRow() {
  const state = usePushState().data;
  const subscribe = usePushSubscribe();
  if (state?.subscribed) return <Done text={ActivationCopy.notifyOn} />;
  return (
    <div className="grid gap-1">
      <Button
        variant="outline"
        className="justify-self-start"
        disabled={!state?.available || state.blocked}
        onClick={() => void subscribe()}
      >
        <Bell aria-hidden="true" />
        {ActivationCopy.notify}
      </Button>
      <p className="text-sm text-muted-foreground">
        {state?.blocked ? ActivationCopy.notifyBlocked : ActivationCopy.notifyHint}
      </p>
    </div>
  );
}

function Done({ text }: Readonly<{ text: string }>) {
  return (
    <p className="flex items-center gap-2 text-sm font-medium">
      <Check className="size-4 text-ok" aria-hidden="true" />
      {text}
    </p>
  );
}
