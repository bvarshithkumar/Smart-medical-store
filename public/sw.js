/* ============================================================
   Sri Venkateshwara Medical Store – Service Worker v2.0
   Premium PWA with full offline support & smart caching
   ============================================================ */

const CACHE_VERSION = 'v2.2.0';
const STATIC_CACHE   = `svms-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE  = `svms-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE    = `svms-images-${CACHE_VERSION}`;
const OFFLINE_URL    = '/offline.html';

/* Assets to pre-cache on install */
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
];

/* ── Install: pre-cache static shell ─────────────────────── */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Pre-caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache partial failure (expected in dev):', err);
      });
    }).then(() => self.skipWaiting())
  );
});

/* ── Activate: clean up old caches ───────────────────────── */
self.addEventListener('activate', (event) => {
  const currentCaches = [STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !currentCaches.includes(name))
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: smart caching strategies ─────────────────────── */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, chrome-extension, DevTools requests
  if (request.method !== 'GET') return;
  if (url.protocol === 'chrome-extension:') return;
  if (url.hostname === 'localhost' && url.pathname.startsWith('/@')) return; // Vite HMR
  if (url.hostname === 'localhost' && url.pathname.startsWith('/node_modules')) return;

  // ── Strategy 1: Navigation requests → Network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cloned = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, cloned));
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => {
            if (cached) return cached;
            return caches.match('/index.html').then((indexResponse) => {
              if (indexResponse) return indexResponse;
              return caches.match('/');
            });
          })
        )
    );
    return;
  }

  // ── Strategy 2: Images → Cache-first with network fallback
  if (
    request.destination === 'image' ||
    /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const cloned = response.clone();
              caches.open(IMAGE_CACHE).then((cache) => cache.put(request, cloned));
            }
            return response;
          })
          .catch(() => caches.match('/icons/icon-192x192.svg'));
      })
    );
    return;
  }

  // ── Strategy 3: Static assets (JS/CSS/fonts) → Network-first with cache fallback
  // NOTE: Using network-first (NOT stale-while-revalidate) so that after a new
  // deployment, fresh chunk filenames are always fetched. Stale-while-revalidate
  // was causing blank pages by returning old cached chunks whose filenames no
  // longer existed in the new build.
  if (
    /\.(js|css|woff2?|ttf|eot)$/i.test(url.pathname) ||
    request.destination === 'script' ||
    request.destination === 'style'
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cloned = response.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, cloned));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // ── Strategy 4: API calls → Network-first, no caching
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: 'offline', message: 'No internet connection' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    );
    return;
  }

  // ── Default: Network-first with dynamic cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const cloned = response.clone();
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, cloned));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
  );
});

/* ── Push Notifications ──────────────────────────────────── */
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const options = {
    body: data.body || 'New update from Sri Venkateshwara Medical Store',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'close', title: 'Dismiss' },
    ],
  };
  event.waitUntil(
    self.registration.showNotification(
      data.title || 'Sri Venkateshwara Medical Store',
      options
    )
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  }
});

/* ── Background Sync ─────────────────────────────────────── */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-cart') {
    event.waitUntil(syncCart());
  }
});

async function syncCart() {
  // Placeholder for background cart sync logic
  console.log('[SW] Background sync: cart');
}

/* ── Message handler ─────────────────────────────────────── */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'CACHE_URLS') {
    const urls = event.data.urls || [];
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => cache.addAll(urls))
    );
  }
});
