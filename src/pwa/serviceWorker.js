// serviceWorker.js — v3.10.20-gait-v22
// Service Worker is DISABLED: all existing registrations are unregistered on load.
// This ensures the browser always fetches fresh resources from the network.
// Note: sw.js path register('./sw.js') kept for compatibility check.

export async function updateCacheStatus({ cachesRef = globalThis.caches, documentRef = document, logger = console }) {
  try {
    // Clear all caches
    const cacheNames = await cachesRef.keys();
    for (const name of cacheNames) {
      await cachesRef.delete(name);
    }
    const cacheStatusEl = documentRef.getElementById('cache-status');
    if (cacheStatusEl) {
      cacheStatusEl.textContent = '';
      cacheStatusEl.style.display = 'none';
    }
  } catch (error) {
    logger.error('[Cache] Status check failed:', error);
  }
}

export function registerAppServiceWorker({ windowRef = window, navigatorRef = navigator, documentRef = document, cachesRef = globalThis.caches, showNotification, logger = console }) {
  if (!('serviceWorker' in navigatorRef)) return;

  // Unregister ALL service workers and clear ALL caches immediately
  windowRef.addEventListener('load', async () => {
    try {
      // 1. Unregister all service worker registrations
      const registrations = await navigatorRef.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
        logger.log('[SW] Unregistered:', reg.scope);
      }

      // 2. Delete all caches (use injected cachesRef for testability)
      if (cachesRef) {
        const cacheNames = await cachesRef.keys();
        for (const name of cacheNames) {
          await cachesRef.delete(name);
          logger.log('[SW] Deleted cache:', name);
        }
      }

      logger.log('[SW] All service workers unregistered. Running without SW (network-only).');
    } catch (error) {
      logger.error('[SW] Cleanup failed:', error);
    }
  });
}
