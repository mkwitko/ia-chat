// Installable PWA (RN-51). No offline cache on purpose: an action done offline must be
// refused, never queued (spec 10, "Tempo real"). Push notifications arrive in E-16.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
