
const CACHE_NAME = 'agentic-ai-cache-{{VERSION}}';

// We precache the core shell. Note: We do NOT precache index.js/tsx here because
// Vite generates hashed filenames (e.g. assets/index.243.js).
// The HTML file (fetched via Network First) will point to the correct hashed assets.
const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/styles/main.css',
    '/favicon.svg',
    '/manifest.json',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return Promise.all(PRECACHE_ASSETS.map(url => {
            return fetch(url).then(res => {
                if (!res.ok) throw new Error(`Request failed: ${url} - ${res.status}`);
                return cache.put(url, res);
            }).catch(err => {
                console.error(`[SW] Failed to cache ${url}:`, err);
                // We don't throw here to allow partial installation if an asset fails
            });
        }));
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET, API calls, and extensions
  if (event.request.method !== 'GET' || url.pathname.startsWith('/api/') || url.protocol === 'chrome-extension:') {
    return;
  }

  // STRATEGY: Network First for HTML/Navigation, Cache First for Assets
  // This ensures users always get the latest version of the app structure.
  
  const isNavigation = event.request.mode === 'navigate';
  const isStaticAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|json|woff|woff2|ttf|eot)$/);

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache First for static assets
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});