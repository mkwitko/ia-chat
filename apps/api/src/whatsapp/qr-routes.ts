import {
  createWahaSessions,
  isWorking,
  needsQr,
  type WahaConfig,
  type WahaSessions,
} from '@app/channels';
import { ChannelStatus } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';
import {
  acceptTermsAndCreate,
  ensureRoute,
  markConnected,
  QR_TERMS_VERSION,
  qrChannel,
} from './qr-store.ts';

// E-09b, spec 03 (RF-27, RF-29): connection by QR code through the WAHA gateway. Optional: the
// official connection stays the recommended one. The panel polls GET while the QR is shown.

const PATH = '/api/whatsapp/qr';
const GATEWAY_FAILED = 'waha session call failed';

export const QrSession = {
  qr: 'qr',
  starting: 'starting',
  failed: 'failed',
  unreachable: 'unreachable',
} as const;

const connectBody = z.object({ accepted: z.literal(true), version: z.literal(QR_TERMS_VERSION) });

export interface QrDeps {
  waha: WahaConfig | undefined;
}

export function registerQrRoutes(app: FastifyInstance, { waha }: QrDeps): void {
  const sessions = waha ? createWahaSessions(waha) : undefined;
  const manage = { preHandler: requireTenant(Permission.whatsappManage) };
  const off = (reply: FastifyReply) =>
    reply.code(HttpStatus.unavailable).send({ error: ErrorCode.whatsappOff });
  app.get(PATH, { preHandler: requireTenant(Permission.integrationsRead) }, (request) =>
    view(request, sessions),
  );
  app.post(`${PATH}/connect`, manage, (request, reply) =>
    sessions ? connect(request, reply, sessions) : off(reply),
  );
  app.post(`${PATH}/restart`, manage, (request, reply) =>
    sessions ? restart(request, reply, sessions) : off(reply),
  );
}

async function connect(request: FastifyRequest, reply: FastifyReply, sessions: WahaSessions) {
  const input = parsed(request, reply, connectBody);
  if (!input) return reply;
  const channel = await acceptTermsAndCreate(input.tenant);
  const session = channel.gatewaySession ?? '';
  const tenantId = input.tenant.tenantId;
  await ensureRoute(request.server.db, { tenantId, channelId: channel.id, session });
  return start(request, reply, { sessions, session });
}

async function restart(request: FastifyRequest, reply: FastifyReply, sessions: WahaSessions) {
  const channel = await tenantOf(request).withTenant(qrChannel);
  if (!channel?.gatewaySession)
    return reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound });
  return start(request, reply, { sessions, session: channel.gatewaySession });
}

async function start(
  request: FastifyRequest,
  reply: FastifyReply,
  { sessions, session }: { sessions: WahaSessions; session: string },
) {
  try {
    await sessions.start(session);
  } catch (error) {
    request.log.warn(
      { tenantId: tenantOf(request).tenantId, error: String(error) },
      GATEWAY_FAILED,
    );
    return reply.code(HttpStatus.badGateway).send({ error: ErrorCode.whatsappFailed });
  }
  return view(request, sessions);
}

/** DB state; while not connected, the live session from WAHA and its current QR code. */
async function view(request: FastifyRequest, sessions: WahaSessions | undefined) {
  const tenant = tenantOf(request);
  const base = { available: sessions !== undefined, termsVersion: QR_TERMS_VERSION };
  let channel = await tenant.withTenant(qrChannel);
  if (!channel) return { ...base, channel: null };
  const shown = (session: object | null) => ({
    ...base,
    channel: { status: channel?.status, displayPhone: channel?.displayPhone ?? null, session },
  });
  if (!sessions || !channel.gatewaySession || channel.status === ChannelStatus.connected)
    return shown(null);
  const live = await liveSession(sessions, channel.gatewaySession);
  if (live.working) channel = await markConnected(tenant, channel.id, live.phone);
  return shown(live.working ? null : live.session);
}

type Live = { working: true; phone: string | undefined } | { working: false; session: object };

async function liveSession(sessions: WahaSessions, name: string): Promise<Live> {
  const info = await sessions.status(name).catch(() => null);
  if (!info) return { working: false, session: { state: QrSession.unreachable } };
  if (isWorking(info.status)) return { working: true, phone: info.phone };
  if (!needsQr(info.status)) return { working: false, session: { state: QrSession.failed } };
  const qr = await sessions.qr(name).catch(() => null);
  return {
    working: false,
    session: qr ? { state: QrSession.qr, qr } : { state: QrSession.starting },
  };
}
