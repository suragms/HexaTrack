const CACHE_NAME = 'hexatrack-core-v4';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/favicon.ico',
  '/icon.png',
  '/logo.png',
  '/logo-dark.png',
  '/icons/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/maskable-icon-192x192.png',
  '/icons/maskable-icon-512x512.png'
];

// Install Event: cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching static app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event: clean up deprecated cache entries
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Clearing deprecated cache pool:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: advanced routing and caching strategies (SWR for code, Cache-First for static assets)
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Intercept only standard HTTP GET requests
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  // Bypass API requests completely (handled by custom Zustand/React Query offline strategies)
  if (req.url.includes('/api/')) return;

  // Bypass ALL Next.js build assets — these contain hashed filenames that change on every
  // build/restart. Caching them causes 404 cascades after redeployments or dev server restarts.
  if (req.url.includes('/_next/')) return;

  // Bypass Next.js hot-reload development servers
  if (req.url.includes('/_next/webpack-hmr') || req.url.includes('hot-update')) return;

  // Strategy: Static Assets (Images, Icons, Fonts) -> Cache-First
  const isStaticAsset = 
    req.url.match(/\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/) || 
    req.url.includes('/icons/');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((networkRes) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, networkRes.clone());
            return networkRes;
          });
        }).catch(() => {
          // If no cache and network failed, try to fallback to default logo/icon if appropriate
          if (req.url.includes('icon.png')) return caches.match('/icon.png');
          return new Response('Offline asset unavailable', { status: 408 });
        });
      })
    );
    return;
  }

  // Strategy: App Shell / Pages / Scripts / CSS -> Stale-While-Revalidate (SWR)
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const cacheCopy = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, cacheCopy);
          });
        }
        return networkRes;
      }).catch((err) => {
        console.warn('[Service Worker] Network request failed, serving stale resource', err);
        // Serve offline fallback page for HTML navigation requests
        if (req.headers.get('accept')?.includes('text/html')) {
          return caches.match('/offline.html');
        }
        // If we have a cached version, we successfully serve it, so we don't throw the error.
        if (cached) {
          return cached;
        }
        throw err;
      });

      return cached || fetchPromise;
    })
  );
});

// Push Notification Event: Display high-fidelity native push banners
self.addEventListener('push', (event) => {
  let data = {
    title: 'HexaTrack Alert',
    body: 'Your automated finance queue is active.',
    icon: '/icons/icon-192x192.png',
    badge: '/favicon.ico',
    tag: 'hexatrack-alert'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/favicon.ico',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: '1'
    },
    actions: [
      { action: 'explore', title: 'Open Workspace', icon: '/icons/icon-192x192.png' },
      { action: 'close', title: 'Dismiss' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification Click Event: handles deep linking to dashboard
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a dashboard window is already open, focus it
      for (const client of windowClients) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window to dashboard
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
