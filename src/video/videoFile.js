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
  videoElement.autoplay = false;
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
      // readyState >= 2 (HAVE_CURRENT_DATA) means the browser has decoded at
      // least one frame and drawImage/createImageBitmap will return real pixels.
      // videoWidth > 0 alone (readyState=1 / HAVE_METADATA) is NOT sufficient —
      // drawing at that stage returns a black frame.
      // We still accept readyState=2 even when videoWidth/videoHeight are 0
      // (can happen on some mobile browsers that report dimensions later) because
      // the decoder has the first frame ready.
      return videoElement.readyState >= 2;
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

    // Clear any existing src first without calling load() to avoid
    // triggering an extra 'emptied' / media reset cycle.
    if (videoElement.src) {
      videoElement.removeAttribute?.('src');
    }
    videoElement.loop = false;
    videoElement.src = src;
    // Single load() call after src is set is sufficient.
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

const playbackStartLocks = new WeakSet();

export async function startVideoPlaybackForAnalysis({
  videoElement,
  logger = console,
  now = () => Date.now(),
  reloadDelayMs = 100,
  playingTimeoutMs = 5000,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout
}) {
  if (!videoElement) {
    throw new Error('Video element is required');
  }

  if (playbackStartLocks.has(videoElement)) {
    logger.warn?.('[Analysis] Duplicate video start ignored: playback start already in progress');
    return {
      videoEpochBaseMs: now(),
      playbackAlreadyStarting: true
    };
  }

  if (videoElement.paused === false && !videoElement.ended) {
    logger.log('[Analysis] Video already playing; skipping restart');
    return {
      videoEpochBaseMs: now(),
      playbackAlreadyRunning: true
    };
  }

  playbackStartLocks.add(videoElement);
  logger.log('[Analysis] Video mode - starting playback');
  try {
    // When the video has ended, seek back to the start.
    // Do NOT call load() here: load() resets the media resource pipeline and
    // can fire a new 'canplay'/'loadeddata' sequence which, combined with any
    // pending event listeners, causes the video to appear to start twice.
    // Simply resetting currentTime and calling play() is sufficient for a
    // replay after a normal end-of-stream.
    //
    // NOTE: stopAllProcessing() pre-seeks to currentTime=0 when the video ends,
    // so on the second analysis currentTime is already 0.
    //
    // iOS Safari bug: awaiting the 100ms delay (even when currentTime is already 0)
    // breaks the user-gesture context, causing play() to throw NotAllowedError.
    // The delay is only needed when currentTime is NOT at 0 (i.e., the browser needs
    // time to process the seek).  When currentTime is already 0 — which stopAllProcessing()
    // guarantees — we skip the delay entirely and call play() immediately.
    // This is the key fix for "second analysis fails on iOS Safari".
    if (videoElement.currentTime !== 0) {
      // Need to seek: set currentTime=0 and give the browser a tick to process it.
      videoElement.currentTime = 0;
      // Give the browser one tick to process the seek before play().
      await new Promise((resolve) => setTimeoutFn(resolve, reloadDelayMs));
    } else if (videoElement.ended) {
      // currentTime is already 0 (pre-seeked by stopAllProcessing) but ended=true.
      // On most browsers play() clears the ended flag without a seek delay.
      // No await needed — call play() directly to preserve the gesture context.
      logger.log('[Analysis] Video ended but currentTime=0 (pre-seeked); skipping delay before play()');
    }

    // Wait for the 'playing' event to confirm the browser has actually started
    // delivering frames. This is critical when the video was in 'ended' state:
    // play() resolves as soon as playback is *initiated*, but requestVideoFrameCallback
    // will never fire if videoElement.ended is still true at registration time.
    // Waiting for 'playing' guarantees ended=false and the first frame is incoming.
    //
    // Timeout fallback (playingTimeoutMs): if 'playing' never fires (e.g., due to
    // a browser quirk where play() resolves but 'playing' is delayed), we resolve
    // anyway after the timeout so the caller is not permanently hung. This is a
    // last-resort safety net; normal browsers always fire 'playing' after play().
    await new Promise((resolve, reject) => {
      // If already playing (not ended, not paused), resolve immediately.
      if (!videoElement.ended && !videoElement.paused) {
        resolve();
        return;
      }
      let settled = false;
      let timeoutHandle = null;

      const cleanup = () => {
        videoElement.removeEventListener('playing', onPlaying);
        videoElement.removeEventListener('error', onError);
        if (timeoutHandle !== null) {
          clearTimeoutFn(timeoutHandle);
          timeoutHandle = null;
        }
      };

      const onPlaying = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve();
      };
      const onError = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error('Video error during play'));
      };

      videoElement.addEventListener('playing', onPlaying);
      videoElement.addEventListener('error', onError);

      // Safety timeout: resolve after playingTimeoutMs even if 'playing' never fires.
      // This prevents a permanent hang if the browser emits play() resolved but
      // omits the 'playing' event (seen on some iOS Safari versions).
      timeoutHandle = setTimeoutFn(() => {
        if (settled) return;
        settled = true;
        cleanup();
        logger.warn?.('[Analysis] "playing" event timeout — resolving anyway after ' + playingTimeoutMs + 'ms');
        resolve();
      }, playingTimeoutMs);

      videoElement.play().catch((err) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      });
    });

    logger.log('[Analysis] Video play() succeeded');

    return {
      videoEpochBaseMs: now()
    };
  } finally {
    playbackStartLocks.delete(videoElement);
  }
}
