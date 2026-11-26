import {
  QR_SESSION_PREFIX,
  WahaError,
  WahaSessionStatus,
  wahaSessionState,
  type WahaSessions,
} from '@app/channels';
import type { Db } from '@app/db';
import { AlertEvent, type Alert } from '@app/observability';
import { applyChannelState } from '../inbound/channel-state.ts';
import type { Notice } from '../notify/reasons.ts';

// RF-29: the QR code session can drop without a webhook (container restart, missed event).
// Every few minutes each QR channel is checked against WAHA; a drop alerts and pushes the owner.

const UNREACHABLE = 'waha_unreachable';
const NOT_FOUND = 404;
const DOWN_TAG = 'channel_down';
const CONNECTIONS_PATH = '/mais/consultorio/whatsapp';

/** RN-38: no number, no content. What happened and where to tap. */
export const CHANNEL_DOWN_NOTICE: Notice = {
  title: 'WhatsApp desconectado',
  body: 'O assistente parou de responder neste número. Toque para gerar um novo QR code.',
  url: CONNECTIONS_PATH,
  tag: DOWN_TAG,
  urgent: true,
};

/** Called once when a connected channel goes down: operator alert and the owner's push. */
export type ChannelDown = (tenantId: string) => void;

export function channelDownHandler(
  alert: Alert,
  push: (tenantId: string) => Promise<void>,
): ChannelDown {
  return (tenantId) => {
    alert(AlertEvent.channelDisconnected, { tenantId });
    void push(tenantId).catch(() => undefined); // a failing push must not fail the job
  };
}

export interface HealthDeps {
  db: Db;
  sessions: Pick<WahaSessions, 'status'>;
  alert: Alert;
  onDown: ChannelDown;
}

export async function checkQrSessions(
  deps: HealthDeps,
): Promise<{ checked: number; down: number }> {
  const { db, sessions } = deps;
  const routes = await db.client.channelRoute.findMany({
    where: { accountId: { startsWith: QR_SESSION_PREFIX } },
  });
  let down = 0;
  let unreachable = false;
  for (const route of routes) {
    const info = await sessions.status(route.accountId).catch(missingAsStopped);
    if (!info) unreachable = true;
    const state = info ? wahaSessionState(info.status) : undefined;
    if (!state) continue;
    const dropped = await db.withTenant(route.tenantId, (tx) =>
      applyChannelState(tx, route.channelId, state),
    );
    if (!dropped) continue;
    down += 1;
    deps.onDown(route.tenantId);
  }
  if (unreachable) deps.alert(AlertEvent.channelDisconnected, { code: UNREACHABLE });
  return { checked: routes.length, down };
}

/** A session WAHA no longer knows (volume lost, deleted) is down; any other failure is unknown. */
function missingAsStopped(error: unknown) {
  return error instanceof WahaError && error.status === NOT_FOUND
    ? { status: WahaSessionStatus.stopped, phone: undefined }
    : null;
}
