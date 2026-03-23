export async function updateCacheStatus({ cachesRef = caches, documentRef = document, logger = console }) {
  try {
    const cacheNames = await cachesRef.keys();
    const gaitCaches = cacheNames.filter((name) => name.startsWith('gait-vision-cache-'));
    const cacheStatusEl = documentRef.getElementById('cache-status');
    if (!cacheStatusEl) return;

    if (gaitCaches.length > 0) {
      const latestCache = gaitCaches[gaitCaches.length - 1];
      const cache = await cachesRef.open(latestCache);
      const keys = await cache.keys();

      if (keys.length > 0) {
        cacheStatusEl.textContent = `📦 キャッシュ済み (${keys.length}個)`;
        cacheStatusEl.style.color = '#10b981';
        cacheStatusEl.style.display = 'inline';
      } else {
        cacheStatusEl.textContent = '⏳ キャッシュ中...';
        cacheStatusEl.style.color = '#f59e0b';
        cacheStatusEl.style.display = 'inline';
      }
    } else {
      cacheStatusEl.textContent = '⏳ 初回キャッシュ中...';
      cacheStatusEl.style.color = '#f59e0b';
      cacheStatusEl.style.display = 'inline';
    }
  } catch (error) {
    logger.error('[Cache] Status check failed:', error);
  }
}

export function registerAppServiceWorker({ windowRef = window, navigatorRef = navigator, documentRef = document, showNotification, logger = console }) {
  if (!('serviceWorker' in navigatorRef)) {
    logger.warn('[Service Worker] Not supported in this browser');
    return;
  }

  windowRef.addEventListener('load', async () => {
    try {
      const registration = await navigatorRef.serviceWorker.register('./sw.js', { scope: './' });
      logger.log('[Service Worker] Registered successfully:', registration.scope);

      setTimeout(() => updateCacheStatus({ documentRef, logger }), 2000);
      setInterval(() => updateCacheStatus({ documentRef, logger }), 60000);
      setInterval(() => registration.update(), 300000);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        logger.log('[Service Worker] New version found, installing...');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigatorRef.serviceWorker.controller) {
            const updateNotice = windowRef.confirm('新しいバージョンが利用可能です。\n\nリロードして最新版を適用しますか？');
            if (updateNotice) {
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              windowRef.location.reload();
            }
          }
        });
      });

      navigatorRef.serviceWorker.addEventListener('controllerchange', () => {
        logger.log('[Service Worker] Controller changed, reloading...');
        windowRef.location.reload();
      });
    } catch (error) {
      logger.error('[Service Worker] Registration failed:', error);
      showNotification?.('Service Workerの登録に失敗しました', 'error');
    }
  });
}
