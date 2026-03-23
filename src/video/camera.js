export function buildCameraConstraints({ windowWidth, windowHeight }) {
  const portrait = windowHeight > windowWidth;
  const aspectRatio = portrait ? 9 / 16 : 16 / 9;

  return [
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: portrait ? { ideal: 1080 } : { ideal: 1920 },
        height: portrait ? { ideal: 1920 } : { ideal: 1080 },
        aspectRatio: { ideal: aspectRatio },
        frameRate: { ideal: 30, max: 30 }
      }
    },
    {
      video: {
        facingMode: { ideal: 'user' },
        aspectRatio: { ideal: aspectRatio },
        frameRate: { ideal: 30, max: 30 }
      }
    },
    { video: true }
  ];
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
    const timeout = setTimeout(() => reject(new Error('Timeout')), timeoutMs);
    videoElement.onloadedmetadata = async () => {
      try {
        await videoElement.play();
        clearTimeout(timeout);
        resolve();
      } catch (error) {
        clearTimeout(timeout);
        reject(error);
      }
    };
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
  let lastError = null;

  for (const constraint of constraints) {
    try {
      const mediaStream = await mediaDevices.getUserMedia(constraint);
      videoElement.srcObject = mediaStream;
      await waitForVideoMetadataAndPlayFn({
        videoElement,
        timeoutMs
      });
      return mediaStream;
    } catch (error) {
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
