export function createVideoFileInput({ documentRef = globalThis.document, accept = 'video/*' } = {}) {
  if (!documentRef?.createElement) {
    throw new Error('Document reference is required to create a file input');
  }
  const input = documentRef.createElement('input');
  input.type = 'file';
  input.accept = accept;
  input.multiple = false;
  return input;
}

export function triggerVideoFilePicker({
  input,
  documentRef = globalThis.document,
  logger = console
} = {}) {
  if (!input) {
    throw new Error('Video file input is required');
  }

  if (!input.isConnected && documentRef?.body) {
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.width = '1px';
    input.style.height = '1px';
    input.style.opacity = '0';
    input.style.pointerEvents = 'none';
    documentRef.body.appendChild(input);
  }

  input.value = '';

  if (typeof input.showPicker === 'function') {
    try {
      input.showPicker();
      return 'showPicker';
    } catch (error) {
      logger.warn('[Video] showPicker() failed, fallback to click():', error);
    }
  }

  input.click();
  return 'click';
}

export function disposeVideoFileInput({ input } = {}) {
  if (!input) return;
  if (input.parentNode) {
    input.parentNode.removeChild(input);
  }
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
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      reject(new Error('Invalid timeout'));
      return;
    }

    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
      logger.error(`[Video] ❌ Load timeout after ${timeoutSeconds} seconds`);
      if (pollInterval) clearInterval(pollInterval);
      cleanup();
      reject(new Error('Timeout'));
    }, timeoutMs);

    let pollInterval = null;
    const hasRenderableFrame = () => {
      const hasDimensions = videoElement.videoWidth > 0 && videoElement.videoHeight > 0;
      const hasDecodedFrame = videoElement.readyState >= 2;
      const hasFiniteDuration = Number.isFinite(videoElement.duration) && videoElement.duration > 0;
      return hasDimensions || (hasDecodedFrame && hasFiniteDuration);
    };

    const done = (eventName) => {
      if (settled) {
        logger.log('[Video] Event', eventName, 'fired but already resolved');
        return;
      }

      logger.log('[Video] Event fired:', eventName, '| readyState:', videoElement.readyState, '| dimensions:', videoElement.videoWidth, 'x', videoElement.videoHeight, '| duration:', videoElement.duration);
      if (hasRenderableFrame()) {
        settled = true;
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
      if (settled) return;
      settled = true;
      const mediaError = videoElement.error;
      logger.error('[Video] ❌ Load error:', error, mediaError);
      clearTimeout(timeout);
      if (pollInterval) clearInterval(pollInterval);
      cleanup();
      reject(new Error(mediaError?.message || 'Load failed'));
    };

    const cleanup = () => {
      videoElement.removeEventListener?.('loadedmetadata', doneMetadata);
      videoElement.removeEventListener?.('loadeddata', doneData);
      videoElement.removeEventListener?.('canplay', doneCanplay);
      videoElement.removeEventListener?.('canplaythrough', doneCanplaythrough);
      videoElement.removeEventListener?.('error', onError);
    };

    const doneMetadata = () => done('loadedmetadata');
    const doneData = () => done('loadeddata');
    const doneCanplay = () => done('canplay');
    const doneCanplaythrough = () => done('canplaythrough');

    videoElement.addEventListener?.('loadedmetadata', doneMetadata);
    videoElement.addEventListener?.('loadeddata', doneData);
    videoElement.addEventListener?.('canplay', doneCanplay);
    videoElement.addEventListener?.('canplaythrough', doneCanplaythrough);
    videoElement.addEventListener?.('error', onError);

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

    if (hasRenderableFrame()) {
      done('already-ready');
    }

    pollInterval = setInterval(() => {
      if (settled) return;
      if (hasRenderableFrame()) {
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
