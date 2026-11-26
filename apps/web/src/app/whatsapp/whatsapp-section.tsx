import { LoadError } from '../inbox/query-states';
import { useState } from 'react';
import { toast } from 'sonner';
import { notifyError } from '@/lib/notify';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { Route } from '@/routes';
import { ApiError } from '@/lib/api';
import { runEmbeddedSignup } from './embedded-signup';
import { HistoryImport } from './history-import';
import {
  WhatsappError,
  useFinishSignup,
  useRetrySetup,
  useWhatsappStatus,
  type WhatsappChannel,
} from './whatsapp-api';
import { WhatsappCopy as Copy } from './whatsapp-copy';

const FORBIDDEN = 403;
// nv: Meta's billing hub, where a WhatsApp account gets its card; confirm with the first client.
const META_PAYMENT_URL = 'https://business.facebook.com/billing_hub/payment_settings';
const Phase = { idle: 'idle', opening: 'opening', finishing: 'finishing' } as const;
type Phase = (typeof Phase)[keyof typeof Phase];

/** Spec 03 "Onboarding do canal" and spec 10 "Conexões": connect the number, see its state. */
export function WhatsappSection() {
  return (
    <section className="grid gap-3">
      <h2 className="text-lg">{Copy.heading}</h2>
      <p className="text-sm text-muted-foreground">{Copy.intro}</p>
      <WhatsappConnect />
    </section>
  );
}

/** The state of the number and the one button that connects it (Meu consultório › WhatsApp). */
export function WhatsappConnect({ withHistory = true }: Readonly<{ withHistory?: boolean }>) {
  const status = useWhatsappStatus();
  const { appId, configId, available, channel } = status.data ?? {};
  return (
    <div className="grid gap-3">
      {status.isError && (
        <LoadError message={Copy.loadFailed} onRetry={() => void status.refetch()} />
      )}
      {status.data && (!available || !appId || !configId) && <Unavailable />}
      {channel && <ChannelState channel={channel} withHistory={withHistory} />}
      {appId && configId && (
        <ConnectButton ids={{ appId, configId }} label={channel ? Copy.reconnect : Copy.connect} />
      )}
      <PaymentNote />
    </div>
  );
}

/** Says why the connection is off (the platform's Meta keys are not set) and what to do meanwhile. */
function Unavailable() {
  return (
    <div role="status" className="grid justify-items-start gap-2 rounded-lg border bg-muted p-4">
      <p className="font-semibold">{Copy.offTitle}</p>
      <p className="text-sm text-muted-foreground">{Copy.offWhy}</p>
      <p className="text-sm text-muted-foreground">{Copy.offWhat}</p>
      <Button asChild variant="outline" className="mt-1">
        <Link to={Route.simulator}>{Copy.offAction}</Link>
      </Button>
    </div>
  );
}

function ChannelState({
  channel,
  withHistory,
}: Readonly<{ channel: WhatsappChannel; withHistory: boolean }>) {
  if (!channel.ready)
    return (
      <div className="grid gap-2">
        <p role="alert">{Copy.pending}</p>
        {channel.error && (
          <p className="text-sm">
            {channel.error.message} {channel.error.action}
          </p>
        )}
        <RetryButton label={Copy.retry} />
      </div>
    );
  return (
    <div className="grid gap-1">
      <p className="font-semibold">
        {channel.displayPhone ? Copy.connected(channel.displayPhone) : Copy.connectedNoPhone}
      </p>
      {channel.coexistence && <p className="text-sm">{Copy.coexistence}</p>}
      {withHistory && channel.coexistence && <HistoryImport history={channel.history} />}
    </div>
  );
}

function failureMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return Copy.failed;
  if (error.status === FORBIDDEN) return Copy.ownerOnly;
  return error.code === WhatsappError.taken ? Copy.taken : Copy.failed;
}

interface SignupIds {
  appId: string;
  configId: string;
}

/** Meta's popup, then our API finishing the setup; the phase drives the progress text. */
function useConnectFlow(ids: SignupIds) {
  const finish = useFinishSignup();
  const [phase, setPhase] = useState<Phase>(Phase.idle);
  const idle = () => {
    setPhase(Phase.idle);
  };
  const start = async () => {
    setPhase(Phase.opening);
    const result = await runEmbeddedSignup(ids).catch(() => {
      notifyError(Copy.sdkFailed);
      return undefined;
    });
    if (result === null) toast(Copy.cancelled);
    if (!result) {
      idle();
      return;
    }
    setPhase(Phase.finishing);
    finish.mutate(result, {
      onError: (error) => notifyError(failureMessage(error)),
      onSettled: idle,
    });
  };
  return { phase, start };
}

function ConnectButton({ ids, label }: Readonly<{ ids: SignupIds; label: string }>) {
  const { phase, start } = useConnectFlow(ids);
  return (
    <div className="grid gap-2">
      <Button
        className="justify-self-start"
        // Connected already: changing the number is the rare path, so it does not shout.
        variant={label === Copy.reconnect ? 'outline' : 'default'}
        disabled={phase !== Phase.idle}
        onClick={() => void start()}
      >
        {label}
      </Button>
      <p role="status" className="text-sm text-muted-foreground">
        {phase === Phase.opening && Copy.opening}
        {phase === Phase.finishing && Copy.finishing}
      </p>
    </div>
  );
}

/** H-05: the card is the professional's, added at Meta; we cannot read it, so we only explain. */
function PaymentNote() {
  return (
    <p className="text-sm text-muted-foreground">
      {Copy.payment}{' '}
      <a
        className="font-semibold underline"
        href={META_PAYMENT_URL}
        target="_blank"
        rel="noreferrer"
      >
        {Copy.paymentLink}
      </a>
    </p>
  );
}

function RetryButton({ label }: Readonly<{ label: string }>) {
  const retry = useRetrySetup();
  return (
    <Button
      variant="outline"
      className="justify-self-start"
      disabled={retry.isPending}
      onClick={() => {
        retry.mutate(undefined, { onError: (error) => notifyError(failureMessage(error)) });
      }}
    >
      {retry.isPending ? Copy.retrying : label}
    </Button>
  );
}
