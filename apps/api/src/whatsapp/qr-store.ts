import { sessionName } from '@app/channels';
import { ChannelKind, ChannelStatus, type Db, type Tx } from '@app/db';
import type { TenantContext } from '../auth/tenant-guard.ts';
import { audit, AuditAction } from '../setup/audit.ts';

/** docs/legal/termo-conexao-qr.md: the version the panel shows. A new text needs a new accept. */
export const QR_TERMS_VERSION = '1.0';
const TERMS_ENTITY = 'whatsapp_qr_terms';

/** The tenant's QR code channel, the most recent one. */
export function qrChannel(tx: Tx) {
  return tx.channel.findFirst({
    where: { kind: ChannelKind.qr_gateway },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * RF-27: the accept goes to the audit log (who, when, which version) in the same transaction
 * that creates the channel; no accept, no channel.
 */
export async function acceptTermsAndCreate(tenant: TenantContext) {
  return tenant.withTenant(async (tx) => {
    const existing = await qrChannel(tx);
    const channel =
      existing ??
      (await tx.channel.create({
        data: { tenantId: tenant.tenantId, kind: ChannelKind.qr_gateway },
      }));
    await audit(tx, tenant, {
      entity: TERMS_ENTITY,
      entityId: channel.id,
      action: AuditAction.accept,
      after: { version: QR_TERMS_VERSION, acceptedAt: new Date().toISOString() },
    });
    if (existing?.gatewaySession) return existing;
    return tx.channel.update({
      where: { id: channel.id },
      data: { gatewaySession: sessionName(channel.id) },
    });
  });
}

/** Routes are platform rows, never rewritten: the session keeps its channel (spec 03). */
export async function ensureRoute(
  db: Db,
  input: { tenantId: string; channelId: string; session: string },
) {
  const route = await db.client.channelRoute.findUnique({ where: { accountId: input.session } });
  if (route) return;
  await db.client.channelRoute.create({
    data: { accountId: input.session, tenantId: input.tenantId, channelId: input.channelId },
  });
}

/** WAHA says the session works: the channel is connected with the paired number. */
export function markConnected(tenant: TenantContext, channelId: string, phone: string | undefined) {
  return tenant.withTenant((tx) =>
    tx.channel.update({
      where: { id: channelId },
      data: { status: ChannelStatus.connected, ...(phone ? { displayPhone: `+${phone}` } : {}) },
    }),
  );
}
