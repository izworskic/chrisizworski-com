'use strict';

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = String(data.title || 'Flight update');
  const body = String(data.body || 'Your watched flight has an update.');
  const url = String(data.url || '/flight-tracker/');
  event.waitUntil(self.registration.showNotification(title,{
    body,
    tag:'flight-watch',
    renotify:true,
    data:{url},
    icon:'/favicon.ico',
    badge:'/favicon.ico'
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification?.data?.url || '/flight-tracker/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await clients.matchAll({type:'window',includeUncontrolled:true});
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin + '/flight-tracker/')) {
        await client.focus();
        if ('navigate' in client) await client.navigate(target);
        return;
      }
    }
    await clients.openWindow(target);
  })());
});
