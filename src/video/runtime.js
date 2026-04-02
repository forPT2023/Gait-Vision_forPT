export function getMediaPipeTimestamp({ hasStream, currentTime, now = () => performance.now(), offset = 0 }) {
  if (hasStream) {
    return now();
  }

  const safeCurrentTime = Number(currentTime);
  if (!Number.isFinite(safeCurrentTime)) {
    return 0;
  }

  return Math.max(0, safeCurrentTime * 1000 + offset);
}

export function getSourceMode({ hasStream, videoFileUrl }) {
  if (videoFileUrl) return 'video';
  if (hasStream) return 'camera';
  return 'idle';
}

export function resetVideoElementEvents(videoElement) {
  if (!videoElement) return;
  videoElement.onloadedmetadata = null;
  videoElement.onloadeddata = null;
  videoElement.oncanplay = null;
  videoElement.oncanplaythrough = null;
  videoElement.onerror = null;
  videoElement.onended = null;
}

export function cancelScheduledMediaWork({
  animationFrameId,
  previewAnimationId,
  cancelAnimationFrameFn = globalThis.cancelAnimationFrame ?? (() => {}),
  videoElement,
  videoFrameCallbackHandle
}) {
  cancelScheduledHandle({
    handle: videoFrameCallbackHandle,
    videoElement,
    preferVideoFrameCallback: true,
    cancelAnimationFrameFn
  });

  cancelScheduledHandle({
    handle: animationFrameId,
    cancelAnimationFrameFn
  });

  cancelScheduledHandle({
    handle: previewAnimationId,
    cancelAnimationFrameFn
  });

  return {
    animationFrameId: null,
    previewAnimationId: null,
    videoFrameCallbackHandle: null
  };
}

export function cancelScheduledHandle({
  handle,
  videoElement,
  preferVideoFrameCallback = false,
  cancelAnimationFrameFn = globalThis.cancelAnimationFrame ?? (() => {})
}) {
  if (!handle) {
    return null;
  }

  if (preferVideoFrameCallback && videoElement?.cancelVideoFrameCallback) {
    try {
      videoElement.cancelVideoFrameCallback(handle);
    } catch (_) {
      // ignore cancellation failures
    }
    return null;
  }

  cancelAnimationFrameFn(handle);
  return null;
}

export function scheduleMediaWork({
  videoElement,
  callback,
  requestAnimationFrameFn = globalThis.requestAnimationFrame ?? (() => null)
}) {
  if (videoElement?.requestVideoFrameCallback) {
    return videoElement.requestVideoFrameCallback(() => callback());
  }

  return requestAnimationFrameFn(callback);
}

export function clearLoadedVideoState({
  videoElement,
  videoFrameCallbackHandle,
  videoFileUrl,
  URLRef = URL,
  logger = console
} = {}) {
  const cancelledState = cancelScheduledMediaWork({
    videoElement,
    videoFrameCallbackHandle
  });

  resetVideoElementEvents(videoElement);

  if (videoFileUrl) {
    try {
      URLRef.revokeObjectURL(videoFileUrl);
    } catch (_) {
      // ignore revoke failures
    }
  }

  try {
    if (videoElement && !videoElement.paused) videoElement.pause();
    if (videoElement) {
      videoElement.currentTime = 0;
      videoElement.removeAttribute('src');
      if (!videoElement.srcObject) {
        videoElement.load();
      }
    }
  } catch (error) {
    logger.warn('[Video] Cleanup warning:', error);
  }

  return {
    videoFileUrl: null,
    videoEpochBaseMs: null,
    videoFrameCallbackHandle: cancelledState.videoFrameCallbackHandle
  };
}

export function prepareForVideoLoad({
  animationFrameId,
  previewAnimationId,
  cancelAnimationFrameFn = globalThis.cancelAnimationFrame ?? (() => {}),
  videoElement,
  videoFrameCallbackHandle,
  videoFileUrl,
  URLRef = URL,
  logger = console,
  mediaRecorder,
  chartController,
  mediaStream,
  releaseCameraFn,
  analyzedVideoButton
}) {
  const cancelledState = cancelScheduledMediaWork({
    animationFrameId,
    previewAnimationId,
    cancelAnimationFrameFn,
    videoElement,
    videoFrameCallbackHandle
  });

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  chartController?.pauseCharts?.();

  if (mediaStream) {
    releaseCameraFn?.();
  }

  const clearedVideoState = clearLoadedVideoState({
    videoElement,
    videoFrameCallbackHandle,
    videoFileUrl,
    URLRef,
    logger
  });

  if (analyzedVideoButton) {
    analyzedVideoButton.disabled = true;
  }

  return {
    isAnalyzing: false,
    isRecording: false,
    animationFrameId: cancelledState.animationFrameId,
    previewAnimationId: cancelledState.previewAnimationId,
    ...clearedVideoState
  };
}

export function getAnalysisFrameGate({
  readyState,
  isVideoMode,
  isPaused,
  mpTimestamp,
  lastMpTimestamp
}) {
  if (readyState < 2) {
    return {
      shouldSkip: true,
      nextLastMpTimestamp: lastMpTimestamp
    };
  }

  if (isVideoMode && isPaused) {
    return {
      shouldSkip: true,
      nextLastMpTimestamp: lastMpTimestamp
    };
  }

  if (isVideoMode && mpTimestamp <= lastMpTimestamp) {
    return {
      shouldSkip: true,
      nextLastMpTimestamp: lastMpTimestamp
    };
  }

  return {
    shouldSkip: false,
    nextLastMpTimestamp: mpTimestamp
  };
}


export function scheduleAnalysisFrame({
  isAnalyzing,
  isVideoMode,
  videoElement,
  callback,
  requestAnimationFrameFn = globalThis.requestAnimationFrame ?? (() => null)
}) {
  if (!isAnalyzing) {
    return {
      animationFrameId: null,
      videoFrameCallbackHandle: null
    };
  }

  const handle = scheduleMediaWork({
    videoElement: isVideoMode ? videoElement : null,
    callback,
    requestAnimationFrameFn
  });

  if (isVideoMode && videoElement?.requestVideoFrameCallback) {
    return {
      animationFrameId: null,
      videoFrameCallbackHandle: handle
    };
  }

  return {
    animationFrameId: handle,
    videoFrameCallbackHandle: null
  };
}

export function prepareAnalysisFrame({
  isAnalyzing,
  readyState,
  isVideoMode,
  isPaused,
  mpTimestamp,
  lastMpTimestamp,
  frameCount,
  analysisStartMpTimestamp
}) {
  if (!isAnalyzing) {
    return {
      shouldStop: true,
      shouldSkip: false,
      nextFrameCount: frameCount,
      nextAnalysisStartMpTimestamp: analysisStartMpTimestamp,
      elapsedMs: null,
      nextLastMpTimestamp: lastMpTimestamp
    };
  }

  const frameGate = getAnalysisFrameGate({
    readyState,
    isVideoMode,
    isPaused,
    mpTimestamp,
    lastMpTimestamp
  });

  if (frameGate.shouldSkip) {
    return {
      shouldStop: false,
      shouldSkip: true,
      nextFrameCount: frameCount,
      nextAnalysisStartMpTimestamp: analysisStartMpTimestamp,
      elapsedMs: null,
      nextLastMpTimestamp: frameGate.nextLastMpTimestamp
    };
  }

  const nextFrameCount = frameCount + 1;
  const nextAnalysisStartMpTimestamp = analysisStartMpTimestamp == null
    ? mpTimestamp
    : analysisStartMpTimestamp;

  return {
    shouldStop: false,
    shouldSkip: false,
    nextFrameCount,
    nextAnalysisStartMpTimestamp,
    elapsedMs: Math.max(0, mpTimestamp - nextAnalysisStartMpTimestamp),
    nextLastMpTimestamp: frameGate.nextLastMpTimestamp
  };
}

export function getPostAnalysisStopPlan({
  hasStream,
  hasVideoSource,
  isVideoPaused,
  hasAnalysisData
}) {
  return {
    restartPreview: hasStream,
    pauseVideo: !hasStream && hasVideoSource && !isVideoPaused,
    restoreVideoRecordButton: !hasStream && hasVideoSource,
    enableExports: hasAnalysisData
  };
}

export function findClosestAnalysisPoint(analysisData, elapsedMs) {
  if (!Array.isArray(analysisData) || analysisData.length === 0) return null;
  const safeElapsedMs = Number(elapsedMs);
  const targetElapsedMs = Number.isFinite(safeElapsedMs) ? safeElapsedMs : 0;

  let low = 0;
  let high = analysisData.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const midValue = analysisData[mid].elapsedMs ?? analysisData[mid].timestamp ?? 0;
    if (midValue < targetElapsedMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const candidate = analysisData[low];
  const previous = analysisData[Math.max(0, low - 1)];
  const candidateTime = candidate?.elapsedMs ?? candidate?.timestamp ?? 0;
  const previousTime = previous?.elapsedMs ?? previous?.timestamp ?? 0;

  return Math.abs(candidateTime - targetElapsedMs) < Math.abs(previousTime - targetElapsedMs)
    ? candidate
    : previous;
}

function interpolateScalar(startValue, endValue, ratio) {
  const safeStart = Number(startValue);
  const safeEnd = Number(endValue);
  if (!Number.isFinite(safeStart) && !Number.isFinite(safeEnd)) return undefined;
  if (!Number.isFinite(safeStart)) return safeEnd;
  if (!Number.isFinite(safeEnd)) return safeStart;
  return safeStart + ((safeEnd - safeStart) * ratio);
}

function interpolateLandmarkSets(startSet, endSet, ratio) {
  if (!Array.isArray(startSet) || !Array.isArray(endSet)) {
    return null;
  }

  if (startSet.length !== endSet.length || startSet.length === 0) {
    return null;
  }

  const interpolated = startSet.map((startLandmark, index) => {
    const endLandmark = endSet[index];
    if (!startLandmark || !endLandmark) {
      return null;
    }

    return {
      x: interpolateScalar(startLandmark.x, endLandmark.x, ratio),
      y: interpolateScalar(startLandmark.y, endLandmark.y, ratio),
      z: interpolateScalar(startLandmark.z, endLandmark.z, ratio),
      visibility: interpolateScalar(startLandmark.visibility, endLandmark.visibility, ratio),
      presence: interpolateScalar(startLandmark.presence, endLandmark.presence, ratio)
    };
  });

  return interpolated.every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y))
    ? interpolated
    : null;
}

export function findInterpolatedAnalysisPoint(analysisData, elapsedMs) {
  if (!Array.isArray(analysisData) || analysisData.length === 0) {
    return null;
  }

  const safeElapsedMs = Number(elapsedMs);
  if (!Number.isFinite(safeElapsedMs)) {
    return findClosestAnalysisPoint(analysisData, 0);
  }

  if (analysisData.length === 1) {
    return analysisData[0];
  }

  let low = 0;
  let high = analysisData.length - 1;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const midValue = analysisData[mid].elapsedMs ?? analysisData[mid].timestamp ?? 0;
    if (midValue < safeElapsedMs) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  const upper = analysisData[low];
  const lower = analysisData[Math.max(0, low - 1)];
  const upperTime = upper?.elapsedMs ?? upper?.timestamp ?? 0;
  const lowerTime = lower?.elapsedMs ?? lower?.timestamp ?? 0;

  if (upperTime <= lowerTime) {
    return upper ?? lower ?? null;
  }

  if (safeElapsedMs <= lowerTime) {
    return lower;
  }

  if (safeElapsedMs >= upperTime) {
    return upper;
  }

  const interpolationRatio = (safeElapsedMs - lowerTime) / (upperTime - lowerTime);
  const landmarks = interpolateLandmarkSets(lower?.landmarks, upper?.landmarks, interpolationRatio);
  const worldLandmarks = interpolateLandmarkSets(lower?.worldLandmarks, upper?.worldLandmarks, interpolationRatio);
  const lowerTimestamp = Number(lower?.timestamp);
  const upperTimestamp = Number(upper?.timestamp);
  const timestamp = Number.isFinite(lowerTimestamp) && Number.isFinite(upperTimestamp)
    ? interpolateScalar(lowerTimestamp, upperTimestamp, interpolationRatio)
    : safeElapsedMs;

  if (!landmarks) {
    return findClosestAnalysisPoint(analysisData, safeElapsedMs);
  }

  return {
    ...upper,
    elapsedMs: safeElapsedMs,
    timestamp,
    landmarks,
    worldLandmarks: worldLandmarks || upper?.worldLandmarks || lower?.worldLandmarks || null
  };
}
