export function createVideoFileInput({ documentRef = document, accept = 'video/*' } = {}) {
  const input = documentRef.createElement('input');
  input.type = 'file';
  input.accept = accept;
  return input;
}

export function configureVideoElementForFile(videoElement) {
  videoElement.playsInline = true;
  videoElement.setAttribute('playsinline', '');
  videoElement.preload = 'auto';
  videoElement.muted = true;
}

export function waitForVideoLoad({ videoElement, src, timeoutMs = 30000, logger = console }) {
  return new Promise((resolve, reject) => {
    if (!videoElement || !src) {
      reject(new Error('Invalid video source'));
      return;
    }

    const timeout = setTimeout(() => {
      logger.error('[Video] ❌ Load timeout after 30 seconds');
      if (pollInterval) clearInterval(pollInterval);
      reject(new Error('Timeout'));
    }, timeoutMs);

    let pollInterval = null;
    let resolved = false;
    const done = (eventName) => {
      if (resolved) {
        logger.log('[Video] Event', eventName, 'fired but already resolved');
        return;
      }

      logger.log('[Video] Event fired:', eventName, '| readyState:', videoElement.readyState, '| dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight);
      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        resolved = true;
        clearTimeout(timeout);
        if (pollInterval) clearInterval(pollInterval);
        cleanup();
        logger.log('[Video] ✅ Loaded successfully:', videoElement.videoWidth, 'x', videoElement.videoHeight);
        resolve();
      } else {
        logger.warn('[Video] ⚠️ Event', eventName, 'fired but dimensions not ready:', videoElement.videoWidth, 'x', videoElement.videoHeight);
      }
    };

    const onError = (error) => {
      const mediaError = videoElement.error;
      logger.error('[Video] ❌ Load error:', error, mediaError);
      clearTimeout(timeout);
      if (pollInterval) clearInterval(pollInterval);
      cleanup();
      reject(new Error(mediaError?.message || 'Load failed'));
    };

    const cleanup = () => {
      videoElement.removeEventListener('loadedmetadata', doneMetadata);
      videoElement.removeEventListener('loadeddata', doneData);
      videoElement.removeEventListener('canplay', doneCanplay);
      videoElement.removeEventListener('canplaythrough', doneCanplaythrough);
      videoElement.removeEventListener('error', onError);
    };

    const doneMetadata = () => done('loadedmetadata');
    const doneData = () => done('loadeddata');
    const doneCanplay = () => done('canplay');
    const doneCanplaythrough = () => done('canplaythrough');

    videoElement.addEventListener('loadedmetadata', doneMetadata);
    videoElement.addEventListener('loadeddata', doneData);
    videoElement.addEventListener('canplay', doneCanplay);
    videoElement.addEventListener('canplaythrough', doneCanplaythrough);
    videoElement.addEventListener('error', onError);

    if (videoElement.src) {
      videoElement.removeAttribute?.('src');
      videoElement.load?.();
    }
    videoElement.loop = false;
    videoElement.src = src;
    try {
      videoElement.load?.();
    } catch (error) {
      logger.warn('[Video] load() call failed, continuing:', error);
    }

    if (videoElement.readyState >= 1 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
      done('already-ready');
    }

    pollInterval = setInterval(() => {
      if (resolved) return;
      if (videoElement.readyState >= 1 && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        done('polling-ready');
      }
    }, 150);
  });
}

export async function startVideoPlaybackForAnalysis({
  videoElement,
  logger = console,
  now = () => Date.now(),
  reloadDelayMs = 100,
  setTimeoutFn = setTimeout
}) {
  logger.log('[Analysis] Video mode - starting playback');
  videoElement.currentTime = 0;

  if (videoElement.ended) {
    logger.log('[Analysis] Reloading ended video');
    videoElement.load();
    await new Promise((resolve) => setTimeoutFn(resolve, reloadDelayMs));
  }

  await videoElement.play();
  logger.log('[Analysis] Video play() succeeded');

  return {
    videoEpochBaseMs: now()
  };
}
