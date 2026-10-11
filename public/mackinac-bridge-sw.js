'use strict';
self.addEventListener('push', function (event) {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* ignore invalid payloads */ }
  const body = String(data.body || 'The official bridge conditions have changed.');
  event.waitUntil(self.registration.showNotification('Mackinac Bridge restriction update', {
    body: body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'mackinac-bridge-' + Date.now(),
    data: { url: '/mackinac-bridge-live/' }
  }));
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil((async function () {
    const target = self.location.origin + '/mackinac-bridge-live/';
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(target)) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    await clients.openWindow(target);
  })());
});
