const CACHE = 'pedroex-v5';

const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './truck.jpg',
  './logo2.png',
  './icon-192.png',
  './icon-512.png'
];

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
  
  // For app files, try network first, fallback to cache
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
