import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';

// Web Push of the panel (spec 10, "Notificações"). The server keeps the subscription;
// the notification text never carries message content (RN-38).

const CONFIG_PATH = '/api/push/config';
const SUBSCRIPTIONS_PATH = '/api/push/subscriptions';
const PUT = 'PUT';
const KEY = ['push-state'];
const GRANTED = 'granted';
const BASE64_BLOCK = 4;

export const PushPermission = { granted: 'granted', denied: 'denied' } as const;

interface PushConfig {
  publicKey: string | null;
}

export interface PushState {
  /** The server has VAPID keys and this browser can do Web Push. */
  available: boolean;
  /** This browser is subscribed. */
  subscribed: boolean;
  blocked: boolean;
}

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window;

/** applicationServerKey wants bytes; the public key is URL-safe base64. */
function keyBytes(base64Url: string): Uint8Array<ArrayBuffer> {
  const padded = base64Url
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(base64Url.length / BASE64_BLOCK) * BASE64_BLOCK, '=');
  const raw = atob(padded);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

async function readState(): Promise<PushState> {
  const { publicKey } = await api<PushConfig>(CONFIG_PATH);
  if (!publicKey || !supported()) return { available: false, subscribed: false, blocked: false };
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return {
    available: true,
    subscribed: Boolean(subscription) && Notification.permission === GRANTED,
    blocked: Notification.permission === PushPermission.denied,
  };
}

export function usePushState() {
  return useQuery({ queryKey: KEY, queryFn: readState, retry: false });
}

/** Asks permission, subscribes this browser and tells the server. Returns false when refused. */
export function usePushSubscribe() {
  const client = useQueryClient();
  return async (): Promise<boolean> => {
    const { publicKey } = await api<PushConfig>(CONFIG_PATH);
    if (!publicKey) return false;
    if ((await Notification.requestPermission()) !== GRANTED) {
      await client.invalidateQueries({ queryKey: KEY });
      return false;
    }
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(publicKey),
    });
    await api(SUBSCRIPTIONS_PATH, { method: PUT, body: subscription.toJSON() });
    await client.invalidateQueries({ queryKey: KEY });
    return true;
  };
}
