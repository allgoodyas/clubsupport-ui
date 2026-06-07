// Service Worker for Club Management Push Notifications
// File: src/sw.js (registered manually — no @angular/pwa needed)

const CACHE_NAME = 'club-mgmt-v2';

// ── Install & Activate ────────────────────────────────────────
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

// ── Push event: show notification ─────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'New Notification', body: event.data.text() };
  }

  const options = {
    body:    payload.body  || '',
    icon:    payload.icon  || '/assets/icons/icon-192x192.png',
    badge:   payload.badge || '/assets/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data:    payload.data  || {},
    actions: [],
    tag:     payload.data?.type || 'default',
    renotify: true
  };

  if (payload.data?.type === 'attendance_marked') {
    options.actions = [
      { action: 'view', title: '\uD83D\uDC41 View' }
    ];
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// ── Notification click: open/focus the app ────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/parent/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
