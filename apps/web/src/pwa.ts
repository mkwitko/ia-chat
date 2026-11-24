const SERVICE_WORKER_URL = '/sw.js';

/** Installable PWA (RN-51). Only in production builds, so dev reloads stay fresh. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.register(SERVICE_WORKER_URL);
}
