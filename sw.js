// sw.js v3.10.36-gait-v36 — SELF-UNREGISTER version
// This SW immediately unregisters itself and clears all caches.
// After this runs, no SW will be active. All future requests go directly to the network.

self.addEventListener('install', () => {
  console.log('[SW v11] install: skipWaiting');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // Delete all caches
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n)))),
      // Claim all clients so we can send them a message
      self.clients.claim()
    ])
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then((clients) => {
      console.log('[SW v11] activate: caches cleared, unregistering SW');
      // Tell all open pages to reload to get fresh content
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_UNREGISTERED' });
      });
      // Self-unregister
      return self.registration.unregister();
    })
    .then(() => {
      console.log('[SW v11] unregistered successfully');
    })
  );
});

// Pass through all fetches — never cache anything
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
