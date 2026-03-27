export function buildCameraConstraints({
  windowWidth,
  windowHeight,
  preferredFacingMode = 'environment',
  preferredDeviceId = ''
}) {
  const portrait = windowHeight > windowWidth;
  const aspectRatio = portrait ? 9 / 16 : 16 / 9;
  const oppositeFacingMode = preferredFacingMode === 'user' ? 'environment' : 'user';

  const buildBaseVideo = (facingMode) => ({
    facingMode: { ideal: facingMode },
    aspectRatio: { ideal: aspectRatio },
    frameRate: { ideal: 30, max: 30 }
  });

  if (preferredDeviceId) {
    return [
      {
        video: {
          ...buildBaseVideo(preferredFacingMode),
          deviceId: { exact: preferredDeviceId },
          width: portrait ? { ideal: 1080 } : { ideal: 1920 },
          height: portrait ? { ideal: 1920 } : { ideal: 1080 }
        }
      },
      {
        video: {
          ...buildBaseVideo(preferredFacingMode),
          width: portrait ? { ideal: 1080 } : { ideal: 1920 },
          height: portrait ? { ideal: 1920 } : { ideal: 1080 }
        }
      },
      {
        video: buildBaseVideo(oppositeFacingMode)
      },
      { video: true }
    ];
  }

  return [
    {
      video: {
        ...buildBaseVideo(preferredFacingMode),
        width: portrait ? { ideal: 1080 } : { ideal: 1920 },
        height: portrait ? { ideal: 1920 } : { ideal: 1080 }
      }
    },
    {
      video: buildBaseVideo(oppositeFacingMode)
    },
    { video: true }
  ];
}

export async function listAvailableVideoInputs({
  mediaDevices,
  logger = console
}) {
  if (!mediaDevices?.enumerateDevices) {
    return [];
  }

  try {
    const devices = await mediaDevices.enumerateDevices();
    return devices
      .filter((device) => device.kind === 'videoinput')
      .map((device, index) => ({
        deviceId: device.deviceId,
        label: device.label || `カメラ ${index + 1}`,
        facingMode: inferFacingModeFromLabel(device.label)
      }));
  } catch (error) {
    logger.warn?.('[Camera] Failed to enumerate devices:', error);
    return [];
  }
}

export function inferFacingModeFromLabel(label = '') {
  const normalized = String(label).toLowerCase();

  if (/front|facetime|true depth|user|前|イン/.test(normalized)) {
    return 'user';
  }

  if (/back|rear|environment|外|背面|広角|ultra wide|telephoto/.test(normalized)) {
    return 'environment';
  }

  return 'unknown';
}

export function shouldRestartCameraForOrientationChange({
  hasMediaStream,
  isRecording,
  isAnalyzing,
  sourceMode
}) {
  return Boolean(
    hasMediaStream &&
    sourceMode === 'camera' &&
    !isRecording &&
    !isAnalyzing
  );
}

export function waitForVideoMetadataAndPlay({ videoElement, timeoutMs = 5000 }) {
  return new Promise((resolve, reject) => {
    if (!videoElement || typeof videoElement.play !== 'function') {
      reject(new Error('Invalid video element'));
      return;
    }
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      reject(new Error('Invalid timeout'));
      return;
    }

    if (videoElement?.readyState >= 1) {
      videoElement.play().then(resolve).catch(reject);
      return;
    }

    let settled = false;
    const onLoadedMetadata = async () => {
      if (settled) return;
      try {
        await videoElement.play();
        settled = true;
        cleanup();
        resolve(undefined);
      } catch (error) {
        settled = true;
        cleanup();
        reject(error);
      }
    };

    const onTimeout = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('Timeout'));
    };

    const timeout = setTimeout(onTimeout, timeoutMs);
    let assignedHandler = false;
    const cleanup = () => {
      clearTimeout(timeout);
      if (typeof videoElement?.removeEventListener === 'function') {
        videoElement.removeEventListener('loadedmetadata', onLoadedMetadata);
        return;
      }
      if (assignedHandler && videoElement) {
        videoElement.onloadedmetadata = null;
      }
    };

    if (typeof videoElement?.addEventListener === 'function') {
      videoElement.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
    } else if (videoElement) {
      assignedHandler = true;
      videoElement.onloadedmetadata = onLoadedMetadata;
    }
  });
}

export async function startCameraStreamWithFallbacks({
  mediaDevices,
  videoElement,
  constraints,
  waitForVideoMetadataAndPlayFn = waitForVideoMetadataAndPlay,
  logger = console,
  timeoutMs = 5000
}) {
  if (!mediaDevices?.getUserMedia) {
    throw new Error('MediaDevices.getUserMedia is unavailable');
  }
  if (!videoElement) {
    throw new Error('Video element is required');
  }
  if (!Array.isArray(constraints) || constraints.length === 0) {
    throw new Error('At least one camera constraint is required');
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error('Invalid timeout');
  }

  let lastError = null;

  for (const constraint of constraints) {
    let acquiredStream = null;
    try {
      const mediaStream = await mediaDevices.getUserMedia(constraint);
      acquiredStream = mediaStream;
      videoElement.srcObject = mediaStream;
      await waitForVideoMetadataAndPlayFn({
        videoElement,
        timeoutMs
      });
      return mediaStream;
    } catch (error) {
      if (acquiredStream?.getTracks) {
        stopMediaStream(acquiredStream);
      }
      if (videoElement?.srcObject === acquiredStream) {
        videoElement.srcObject = null;
      }
      lastError = error;
      logger.log?.('Constraint failed:', error);
    }
  }

  throw lastError || new Error('Camera failed');
}

export function stopMediaStream(mediaStream) {
  mediaStream?.getTracks().forEach((track) => track.stop());
}

export function releaseCameraResources({
  previewAnimationId,
  cancelAnimationFrameFn = cancelAnimationFrame,
  mediaStream,
  stopMediaStreamFn = stopMediaStream,
  videoElement,
  canvasCtx,
  canvasElement,
  chartController,
  cameraButton,
  recordButton
}) {
  if (previewAnimationId) {
    cancelAnimationFrameFn(previewAnimationId);
  }
  if (mediaStream) {
    stopMediaStreamFn(mediaStream);
  }
  if (videoElement) {
    videoElement.srcObject = null;
  }
  if (canvasCtx && canvasElement) {
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }
  chartController?.pauseCharts?.();

  if (cameraButton) {
    cameraButton.textContent = '📷 カメラ';
    cameraButton.classList.remove('btn-danger');
    cameraButton.classList.add('btn-primary');
  }

  if (recordButton) {
    recordButton.disabled = true;
  }

  return {
    previewAnimationId: null,
    mediaStream: null
  };
}
