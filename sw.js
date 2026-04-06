// Service Worker for Gait VISION forPT
// Version: 3.10.5-pwa1
// Purpose: Cache all external CDN resources for offline operation

const CACHE_VERSION = 'gait-vision-v3.10.5-pwa1';
const CACHE_NAME = `gait-vision-cache-${CACHE_VERSION}`;

const LOCAL_RESOURCES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon.svg',
  './src/app/bootstrap.js',
  './src/app/session.js',
  './src/app/state.js',
  './src/analysis/constants.js',
  './src/analysis/metrics.js',
  './src/analysis/session.js',
  './src/config/app.js',
  './src/config/report.js',
  './src/report/render.js',
  './src/report/templates/frontal.js',
  './src/report/templates/sagittal.js',
  './src/report/summary.js',
  './src/config/charts.js',
  './src/ui/charts.js',
  './src/ui/controls.js',
  './src/ui/notifications.js',
  './src/ui/orientation.js',
  './src/ui/patient.js',
  './src/ui/reportModal.js',
  './src/ui/screens.js',
  './src/storage/db.js',
  './src/storage/export.js',
  './src/video/camera.js',
  './src/video/recording.js',
  './src/video/runtime.js',
  './src/video/videoFile.js',
  './src/pwa/install.js',
  './src/pwa/serviceWorker.js'
];

// All external resources to cache
const EXTERNAL_RESOURCES_TO_CACHE = [
  // CDN Resources (excluding Tailwind CDN - it's dynamic and will be cached on first fetch)
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/vision_bundle.mjs',
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_internal.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_internal.wasm',
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_nosimd_internal.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm/vision_wasm_nosimd_internal.wasm',
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/global/luxon.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-adapter-luxon@1.3.1/dist/chartjs-adapter-luxon.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-streaming@2.0.0/dist/chartjs-plugin-streaming.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
];

const LOCAL_RESOURCE_PATHS = new Set(LOCAL_RESOURCES.map((path) => {
  const normalized = path.startsWith('./') ? path.slice(1) : path;
  return normalized === '/' ? '/' : normalized;
}));

// Install event: Cache all resources
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching resources...');
        const scopedLocalResources = LOCAL_RESOURCES.map((path) => new URL(path, self.registration.scope).href);
        return Promise.all(scopedLocalResources.map((url) => cache.add(url)))
          .then(() => {
            // External resources are best-effort and logged individually
            return Promise.allSettled(
              EXTERNAL_RESOURCES_TO_CACHE.map((url) => {
                return cache.add(url).catch((error) => {
                  console.warn(`[Service Worker] Failed to cache external resource: ${url}`, error);
                  return null;
                });
              })
            );
          });
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        // Force activation immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event: Cache-first strategy with network fallback
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;
  const normalizedPathname = requestUrl.pathname.endsWith('/')
    ? `${requestUrl.pathname}index.html`
    : requestUrl.pathname;
  const isNavigationRequest = event.request.mode === 'navigate';
  const isLocalAppResource = isSameOrigin && (
    LOCAL_RESOURCE_PATHS.has(requestUrl.pathname) ||
    LOCAL_RESOURCE_PATHS.has(normalizedPathname)
  );

  // For app shell resources, prioritize network to avoid stale UI/logic after deploy.
  if (isNavigationRequest || isLocalAppResource) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse?.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) return cachedResponse;
            if (isNavigationRequest) {
              return caches.match(new URL('./index.html', self.registration.scope).href);
            }
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Found in cache, return immediately
          console.log('[Service Worker] Serving from cache:', event.request.url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        console.log('[Service Worker] Fetching from network:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            // Cache the response for future use (only for external resources AND successful responses)
            if (networkResponse && networkResponse.ok &&
                event.request.url.startsWith('http') && 
                (event.request.url.includes('cdn.') || 
                 event.request.url.includes('jsdelivr') || 
                 event.request.url.includes('googleapis'))) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', event.request.url, error);
            if (event.request.mode === 'navigate') {
              return caches.match(new URL('./index.html', self.registration.scope).href);
            }
            return new Response('Offline - Resource not available', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Message event: Handle cache update requests
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME)
        .then(() => {
          console.log('[Service Worker] Cache cleared');
          return self.clients.matchAll();
        })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({ type: 'CACHE_CLEARED' });
          });
        })
    );
  }
});
