import { useState } from 'react';
import { notifyError } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import {
  QrSessionState,
  useQrConnect,
  useQrRestart,
  useQrStatus,
  type QrChannel,
  type QrImage,
} from './qr-api';
import { QrCopy as Copy } from './qr-copy';
import { QrTerms } from './qr-terms';
import { ChannelStatus } from './whatsapp-api';

const FORBIDDEN = 403;
const failureMessage = (error: unknown) =>
  error instanceof ApiError && error.status === FORBIDDEN ? Copy.ownerOnly : Copy.failed;

/**
 * E-09b, spec 03 (RF-27, RF-29): the QR code connection, below the official one and never in its
 * place. Terms first; then the QR code until WhatsApp pairs; an alert when the session drops.
 */
export function QrSection() {
  const status = useQrStatus().data;
  if (!status || (!status.available && !status.channel)) return null;
  return (
    <section className="grid gap-3">
      <h2 className="text-lg">{Copy.heading}</h2>
      {status.channel ? (
        <ChannelView channel={status.channel} />
      ) : (
        <Start version={status.termsVersion} />
      )}
    </section>
  );
}

function Start({ version }: Readonly<{ version: string }>) {
  const [open, setOpen] = useState(false);
  const connect = useQrConnect();
  if (!open)
    return (
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">{Copy.intro}</p>
        <Button
          variant="outline"
          className="justify-self-start"
          onClick={() => {
            setOpen(true);
          }}
        >
          {Copy.start}
        </Button>
      </div>
    );
  return (
    <QrTerms
      pending={connect.isPending}
      onAccept={() => {
        connect.mutate(version, { onError: (error) => notifyError(failureMessage(error)) });
      }}
      onCancel={() => {
        setOpen(false);
      }}
    />
  );
}

function ChannelView({ channel }: Readonly<{ channel: QrChannel }>) {
  if (channel.status === ChannelStatus.connected)
    return (
      <div className="grid gap-1">
        <p className="font-semibold text-ok">
          {channel.displayPhone ? Copy.connected(channel.displayPhone) : Copy.connectedNoPhone}
        </p>
        <p className="text-sm text-muted-foreground">{Copy.connectedNote}</p>
      </div>
    );
  return (
    <div className="grid gap-3">
      {channel.status === ChannelStatus.disconnected && <DownAlert />}
      <SessionView session={channel.session} />
    </div>
  );
}

/** RF-29: the session dropped; the assistant is stopped on this number until a new scan. */
function DownAlert() {
  return (
    <div role="alert" className="grid gap-1 rounded-lg bg-danger-soft p-4">
      <p className="font-semibold text-danger">{Copy.downTitle}</p>
      <p className="text-sm">{Copy.downBody}</p>
    </div>
  );
}

function SessionView({ session }: Readonly<{ session: QrChannel['session'] }>) {
  if (session?.state === QrSessionState.qr && session.qr) return <QrCode qr={session.qr} />;
  if (session?.state === QrSessionState.starting || !session)
    return (
      <p role="status" className="text-sm text-muted-foreground">
        {Copy.starting}
      </p>
    );
  const message = session.state === QrSessionState.failed ? Copy.expired : Copy.unreachable;
  return (
    <div className="grid gap-2">
      <p className="text-sm">{message}</p>
      <NewQrButton />
    </div>
  );
}

function QrCode({ qr }: Readonly<{ qr: QrImage }>) {
  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-[auto_1fr] md:items-center">
      <img
        src={`data:${qr.mimetype};base64,${qr.data}`}
        alt={Copy.qrAlt}
        className="size-64 justify-self-center rounded-md bg-white p-2"
      />
      <div className="grid gap-2">
        <p className="font-semibold">{Copy.scanTitle}</p>
        <p className="text-sm">{Copy.scanSteps}</p>
        <p className="text-sm text-muted-foreground">{Copy.scanHint}</p>
        <NewQrButton />
      </div>
    </div>
  );
}

function NewQrButton() {
  const restart = useQrRestart();
  return (
    <Button
      variant="outline"
      className="justify-self-start"
      disabled={restart.isPending}
      onClick={() => {
        restart.mutate(undefined, { onError: (error) => notifyError(failureMessage(error)) });
      }}
    >
      {restart.isPending ? Copy.connecting : Copy.newQr}
    </Button>
  );
}
