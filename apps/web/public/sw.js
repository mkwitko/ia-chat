// Installable PWA (RN-51). No offline cache on purpose: an action done offline must be
// refused, never queued (spec 10, "Tempo real").
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

// Web Push (E-16). The server sends title, body and the conversation path, never message
// content (RN-38); `tag` makes a newer notice of a conversation replace the older.
self.addEventListener('push', (event) => {
  const notice = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(notice.title || 'Consultório Aberto', {
      body: notice.body || '',
      tag: notice.tag,
      renotify: Boolean(notice.tag),
      requireInteraction: Boolean(notice.urgent),
      icon: '/icons/icon-192.png',
      data: { url: notice.url || '/conversas' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data.url, self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      const open = windows.find((client) => 'focus' in client);
      if (!open) return self.clients.openWindow(url);
      return open.navigate(url).then((client) => (client || open).focus());
    }),
  );
});
