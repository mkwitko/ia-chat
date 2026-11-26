import * as z from 'zod';
import { wahaCaller, WahaError, type WahaConfig } from './http.ts';
import { WahaSessionStatus } from './schemas.ts';

// Session lifecycle (waha.devlike.pro "Sessions", read 26/11/2026). Webhooks are set once for
// all sessions by the container's environment (WHATSAPP_HOOK_*), so a session needs only a name.

/** Session names are ours: a prefix and the channel id, so they never collide with Meta ids. */
export const QR_SESSION_PREFIX = 'qr-';
const HYPHEN = /-/g;
const CONFLICT = 422;
const EXISTS = 409;

export const sessionName = (channelId: string) =>
  `${QR_SESSION_PREFIX}${channelId.replace(HYPHEN, '')}`;

const sessionSchema = z.object({
  status: z.string(),
  me: z.object({ id: z.string() }).nullish(),
});
const qrSchema = z.object({ mimetype: z.string(), data: z.string() });

export interface SessionInfo {
  status: string;
  /** The paired number, digits only, once WORKING. */
  phone: string | undefined;
}

export interface QrImage {
  mimetype: string;
  /** Base64 PNG. Expires in 60 s, then 20 s each, up to 6 codes (WAHA docs). */
  data: string;
}

export function createWahaSessions(config: WahaConfig) {
  const call = wahaCaller(config);
  const path = (name: string) => `/api/sessions/${encodeURIComponent(name)}`;
  return {
    /** Creates and starts the session; an existing one is restarted for a fresh QR code. */
    async start(name: string): Promise<void> {
      try {
        await call('/api/sessions', { name, start: true });
      } catch (error) {
        if (!(error instanceof WahaError) || (error.status !== CONFLICT && error.status !== EXISTS))
          throw error;
        await call(`${path(name)}/restart`, {});
      }
    },
    async status(name: string): Promise<SessionInfo> {
      const session = sessionSchema.parse(await call(path(name)));
      const phone = session.me?.id.split('@')[0];
      return { status: session.status, phone };
    },
    async qr(name: string): Promise<QrImage> {
      return qrSchema.parse(await call(`/api/${encodeURIComponent(name)}/auth/qr`));
    },
  };
}

export type WahaSessions = ReturnType<typeof createWahaSessions>;

export const isWorking = (status: string) => status === WahaSessionStatus.working;
export const needsQr = (status: string) =>
  status === WahaSessionStatus.scanQr || status === WahaSessionStatus.starting;
