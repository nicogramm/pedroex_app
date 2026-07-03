const CACHE = 'pedroex-v6';

const CACHE_FILES = [
  './',
  './index.html',
  './trucks.html',  // ✅ DAGDAG: Para ma-cache din ang trucks page
  './manifest.json',
  './truck.jpg',
  './logo2.png',
  './icon-192.png',
  './icon-512.png'
];

// ═══════════════════════════════════════
// INSTALL
// ═══════════════════════════════════════
self.addEventListener('install', e => {
  console.log('[SW] Installing...');
  e.waitUntil(
    caches.open(CACHE).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(CACHE_FILES);
    })
  );
  self.skipWaiting();
});

// ═══════════════════════════════════════
// ACTIVATE
// ═══════════════════════════════════════
self.addEventListener('activate', e => {
  console.log('[SW] Activating...');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ═══════════════════════════════════════
// FETCH
// ═══════════════════════════════════════
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // NEVER cache Google APIs or Sheets API
  if (url.includes('googleapis.com') ||
      url.includes('accounts.google.com') ||
      url.includes('fonts.googleapis.com') ||
      url.includes('fonts.gstatic.com') ||
      url.includes('gstatic.com')) {
    return; // Let it pass through
  }

  // ── HTML / navigation requests: ALWAYS go straight to the network and
  // bypass the browser's own HTTP cache (not just the SW cache). Without
  // `cache:'no-store'` here, fetch() can still be silently satisfied by a
  // stale HTTP-cached response (e.g. from GitHub Pages' CDN headers) even
  // though this handler "looks" network-first — that's what was causing
  // updated deploys (like the dashboard billing fix) to not show up until
  // a manual hard-refresh / cache clear. Only fall back to the SW cache if
  // the network request truly fails (offline).
  const isNavigation = e.request.mode === 'navigate' ||
    (e.request.destination === 'document') ||
    url.endsWith('.html') || url.endsWith('/');

  if (isNavigation) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // For other app files (images, manifest, etc.), try network first,
  // fallback to cache.
  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Clone and cache successful responses
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});

// ═══════════════════════════════════════
// ✅ PUSH NOTIFICATION HANDLER (BAGONG DAGDAG)
// ═══════════════════════════════════════
self.addEventListener('push', (event) => {
  console.log('[SW] 📬 Push notification received');

  const data = event.data ? event.data.json() : {
    title: 'PedroEX Alert',
    message: 'You have a new notification'
  };

  const options = {
    body: data.message || data.body || 'New notification',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: [200, 100, 200],
    tag: data.tag || 'pedroex-notification',
    requireInteraction: true,
    actions: [
      {action: 'view', title: '👁️ View', icon: './icon-192.png'},
      {action: 'dismiss', title: '✖️ Dismiss'}
    ],
    data: {
      url: data.url || './trucks.html',
      dateOfArrival: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'PedroEX Alert', options)
  );
});

// ═══════════════════════════════════════
// ✅ NOTIFICATION CLICK HANDLER (BAGONG DAGDAG)
// ═══════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] 🖱️ Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'dismiss') {
    // Just close the notification
    return;
  }

  // Default action or 'view' action
  const urlToOpen = event.notification.data.url || './trucks.html';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((windowClients) => {
      // Check if there's already a window open
      for (let client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// ═══════════════════════════════════════
// ✅ BACKGROUND SYNC (OPTIONAL - for offline support)
// ═══════════════════════════════════════
self.addEventListener('sync', (event) => {
  console.log('[SW] 🔄 Background sync:', event.tag);

  if (event.tag === 'sync-trucks') {
    event.waitUntil(
      // You can add logic here to sync data when connection is restored
      console.log('[SW] Syncing trucks data...')
    );
  }
});
