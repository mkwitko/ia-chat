const SERVICE_WORKER_URL = '/sw.js';

/** Installable PWA with push (RN-51). The worker caches nothing, so registering in dev is harmless. */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return;
  void navigator.serviceWorker.register(SERVICE_WORKER_URL);
}
