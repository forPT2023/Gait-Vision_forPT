import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cancelScheduledHandle,
  cancelScheduledMediaWork,
  clearLoadedVideoState,
  findClosestAnalysisPoint,
  getPostAnalysisStopPlan,
  getAnalysisFrameGate,
  getMediaPipeTimestamp,
  getSourceMode,
  prepareAnalysisFrame,
  prepareForVideoLoad,
  scheduleAnalysisFrame,
  scheduleMediaWork
} from '../src/video/runtime.js';

test('getMediaPipeTimestamp uses wall-clock time for camera streams', () => {
  assert.equal(
    getMediaPipeTimestamp({ hasStream: true, currentTime: 12, now: () => 3456 }),
    3456
  );
});

test('getMediaPipeTimestamp uses video currentTime for file playback', () => {
  assert.equal(
    getMediaPipeTimestamp({ hasStream: false, currentTime: 1.25, now: () => 9999 }),
    1250
  );
});

test('getSourceMode resolves camera, video, and idle states', () => {
  assert.equal(getSourceMode({ hasStream: true, videoFileUrl: null }), 'camera');
  assert.equal(getSourceMode({ hasStream: false, videoFileUrl: 'blob:video' }), 'video');
  assert.equal(getSourceMode({ hasStream: false, videoFileUrl: null }), 'idle');
});

test('findClosestAnalysisPoint returns the nearest elapsed data point', () => {
  const points = [
    { elapsedMs: 0, value: 'start' },
    { elapsedMs: 1000, value: 'mid' },
    { elapsedMs: 2000, value: 'end' }
  ];

  assert.deepEqual(findClosestAnalysisPoint(points, 1400), points[1]);
  assert.deepEqual(findClosestAnalysisPoint(points, 1800), points[2]);
});

test('cancelScheduledMediaWork cancels frame callbacks and animation frames', () => {
  const cancelledFrames = [];
  let cancelledVideoCallback = null;

  const result = cancelScheduledMediaWork({
    animationFrameId: 11,
    previewAnimationId: 22,
    cancelAnimationFrameFn(id) {
      cancelledFrames.push(id);
    },
    videoElement: {
      cancelVideoFrameCallback(handle) {
        cancelledVideoCallback = handle;
      }
    },
    videoFrameCallbackHandle: 33
  });

  assert.equal(cancelledVideoCallback, 33);
  assert.deepEqual(cancelledFrames, [11, 22]);
  assert.deepEqual(result, {
    animationFrameId: null,
    previewAnimationId: null,
    videoFrameCallbackHandle: null
  });
});

test('cancelScheduledHandle prefers cancelVideoFrameCallback when requested', () => {
  let cancelledVideoCallback = null;

  const result = cancelScheduledHandle({
    handle: 44,
    preferVideoFrameCallback: true,
    videoElement: {
      cancelVideoFrameCallback(handle) {
        cancelledVideoCallback = handle;
      }
    },
    cancelAnimationFrameFn() {
      throw new Error('should not use animation frame fallback');
    }
  });

  assert.equal(result, null);
  assert.equal(cancelledVideoCallback, 44);
});

test('cancelScheduledHandle falls back to cancelAnimationFrame', () => {
  const cancelledFrames = [];

  const result = cancelScheduledHandle({
    handle: 55,
    cancelAnimationFrameFn(handle) {
      cancelledFrames.push(handle);
    }
  });

  assert.equal(result, null);
  assert.deepEqual(cancelledFrames, [55]);
});

test('scheduleMediaWork prefers requestVideoFrameCallback when available', () => {
  const calls = [];
  const handle = scheduleMediaWork({
    videoElement: {
      requestVideoFrameCallback(fn) {
        calls.push('videoFrame');
        fn();
        return 17;
      }
    },
    callback() {
      calls.push('callback');
    },
    requestAnimationFrameFn() {
      calls.push('animationFrame');
      return 99;
    }
  });

  assert.equal(handle, 17);
  assert.deepEqual(calls, ['videoFrame', 'callback']);
});

test('scheduleMediaWork falls back to requestAnimationFrame', () => {
  const calls = [];
  const handle = scheduleMediaWork({
    videoElement: {},
    callback() {
      calls.push('callback');
    },
    requestAnimationFrameFn(fn) {
      calls.push('animationFrame');
      fn();
      return 88;
    }
  });

  assert.equal(handle, 88);
  assert.deepEqual(calls, ['animationFrame', 'callback']);
});

test('getAnalysisFrameGate skips frames when media is not ready or paused', () => {
  assert.deepEqual(
    getAnalysisFrameGate({
      readyState: 1,
      isVideoMode: false,
      isPaused: false,
      mpTimestamp: 100,
      lastMpTimestamp: 90
    }),
    { shouldSkip: true, nextLastMpTimestamp: 90 }
  );

  assert.deepEqual(
    getAnalysisFrameGate({
      readyState: 4,
      isVideoMode: true,
      isPaused: true,
      mpTimestamp: 100,
      lastMpTimestamp: 90
    }),
    { shouldSkip: true, nextLastMpTimestamp: 90 }
  );
});

test('getAnalysisFrameGate enforces monotonic timestamps only in video mode', () => {
  assert.deepEqual(
    getAnalysisFrameGate({
      readyState: 4,
      isVideoMode: true,
      isPaused: false,
      mpTimestamp: 80,
      lastMpTimestamp: 90
    }),
    { shouldSkip: true, nextLastMpTimestamp: 90 }
  );

  assert.deepEqual(
    getAnalysisFrameGate({
      readyState: 4,
      isVideoMode: false,
      isPaused: false,
      mpTimestamp: 80,
      lastMpTimestamp: 90
    }),
    { shouldSkip: false, nextLastMpTimestamp: 80 }
  );
});

test('getPostAnalysisStopPlan returns camera restart actions when a stream is active', () => {
  assert.deepEqual(
    getPostAnalysisStopPlan({
      hasStream: true,
      hasVideoSource: false,
      isVideoPaused: false,
      hasAnalysisData: false
    }),
    {
      restartPreview: true,
      pauseVideo: false,
      restoreVideoRecordButton: false,
      enableExports: false
    }
  );
});

test('getPostAnalysisStopPlan returns video restore actions for analyzed video data', () => {
  assert.deepEqual(
    getPostAnalysisStopPlan({
      hasStream: false,
      hasVideoSource: true,
      isVideoPaused: false,
      hasAnalysisData: true
    }),
    {
      restartPreview: false,
      pauseVideo: true,
      restoreVideoRecordButton: true,
      enableExports: true
    }
  );
});

test('clearLoadedVideoState resets handlers, revokes URLs, and clears source state', () => {
  let revokedUrl = null;
  let canceledHandle = null;
  let pauseCalled = false;
  let loadCalled = false;
  const videoElement = {
    onloadedmetadata: () => {},
    onloadeddata: () => {},
    oncanplay: () => {},
    oncanplaythrough: () => {},
    onerror: () => {},
    onended: () => {},
    paused: false,
    currentTime: 5,
    srcObject: null,
    cancelVideoFrameCallback(handle) {
      canceledHandle = handle;
    },
    pause() {
      pauseCalled = true;
      this.paused = true;
    },
    removeAttribute(name) {
      assert.equal(name, 'src');
    },
    load() {
      loadCalled = true;
    }
  };

  const result = clearLoadedVideoState({
    videoElement,
    videoFrameCallbackHandle: 17,
    videoFileUrl: 'blob:demo',
    URLRef: {
      revokeObjectURL(url) {
        revokedUrl = url;
      }
    },
    logger: { warn() {} }
  });

  assert.equal(canceledHandle, 17);
  assert.equal(revokedUrl, 'blob:demo');
  assert.equal(videoElement.currentTime, 0);
  assert.equal(videoElement.onloadedmetadata, null);
  assert.equal(videoElement.onended, null);
  assert.equal(pauseCalled, true);
  assert.equal(loadCalled, true);
  assert.deepEqual(result, {
    videoFileUrl: null,
    videoEpochBaseMs: null,
    videoFrameCallbackHandle: null
  });
});

test('prepareForVideoLoad stops active loops, recorder, camera, and disables analyzed-video save', () => {
  const cancelled = [];
  const analyzedVideoButton = { disabled: false };
  let releasedCamera = false;
  let recorderStopped = false;
  let pausedCharts = false;
  let revokedUrl = null;
  let cancelledVideoCallback = null;
  let loadCalled = false;
  const videoElement = {
    paused: false,
    srcObject: null,
    currentTime: 4,
    cancelVideoFrameCallback(handle) {
      cancelledVideoCallback = handle;
    },
    pause() {
      this.paused = true;
    },
    removeAttribute() {},
    load() {
      loadCalled = true;
    }
  };

  const result = prepareForVideoLoad({
    animationFrameId: 11,
    previewAnimationId: 22,
    cancelAnimationFrameFn(id) {
      cancelled.push(id);
    },
    videoElement,
    videoFrameCallbackHandle: 33,
    videoFileUrl: 'blob:test',
    URLRef: {
      revokeObjectURL(url) {
        revokedUrl = url;
      }
    },
    logger: { warn() {} },
    mediaRecorder: {
      state: 'recording',
      stop() {
        recorderStopped = true;
      }
    },
    chartController: {
      pauseCharts() {
        pausedCharts = true;
      }
    },
    mediaStream: { id: 'stream-1' },
    releaseCameraFn() {
      releasedCamera = true;
    },
    analyzedVideoButton
  });

  assert.deepEqual(cancelled, [11, 22]);
  assert.equal(cancelledVideoCallback, 33);
  assert.equal(revokedUrl, 'blob:test');
  assert.equal(loadCalled, true);
  assert.equal(recorderStopped, true);
  assert.equal(pausedCharts, true);
  assert.equal(releasedCamera, true);
  assert.equal(analyzedVideoButton.disabled, true);
  assert.deepEqual(result, {
    isAnalyzing: false,
    isRecording: false,
    animationFrameId: null,
    previewAnimationId: null,
    videoFileUrl: null,
    videoEpochBaseMs: null,
    videoFrameCallbackHandle: null
  });
});


test('scheduleAnalysisFrame assigns a video frame callback handle in video mode', () => {
  const calls = [];
  const result = scheduleAnalysisFrame({
    isAnalyzing: true,
    isVideoMode: true,
    videoElement: {
      requestVideoFrameCallback(fn) {
        calls.push('videoFrame');
        return 21;
      }
    },
    callback() {
      calls.push('callback');
    },
    requestAnimationFrameFn() {
      throw new Error('should not use animation frame fallback');
    }
  });

  assert.deepEqual(result, {
    animationFrameId: null,
    videoFrameCallbackHandle: 21
  });
  assert.deepEqual(calls, ['videoFrame']);
});

test('scheduleAnalysisFrame assigns an animation frame handle outside video-frame mode', () => {
  const calls = [];
  const result = scheduleAnalysisFrame({
    isAnalyzing: true,
    isVideoMode: false,
    videoElement: {
      requestVideoFrameCallback() {
        throw new Error('video frame callback should not be used');
      }
    },
    callback() {
      calls.push('callback');
    },
    requestAnimationFrameFn(fn) {
      calls.push('animationFrame');
      return 34;
    }
  });

  assert.deepEqual(result, {
    animationFrameId: 34,
    videoFrameCallbackHandle: null
  });
  assert.deepEqual(calls, ['animationFrame']);
});

test('prepareAnalysisFrame stops immediately when analysis has been cancelled', () => {
  assert.deepEqual(
    prepareAnalysisFrame({
      isAnalyzing: false,
      readyState: 4,
      isVideoMode: false,
      isPaused: false,
      mpTimestamp: 100,
      lastMpTimestamp: 90,
      frameCount: 3,
      analysisStartMpTimestamp: 50
    }),
    {
      shouldStop: true,
      shouldSkip: false,
      nextFrameCount: 3,
      nextAnalysisStartMpTimestamp: 50,
      elapsedMs: null,
      nextLastMpTimestamp: 90
    }
  );
});

test('prepareAnalysisFrame increments frame count and stamps elapsed time for runnable frames', () => {
  assert.deepEqual(
    prepareAnalysisFrame({
      isAnalyzing: true,
      readyState: 4,
      isVideoMode: true,
      isPaused: false,
      mpTimestamp: 150,
      lastMpTimestamp: 100,
      frameCount: 7,
      analysisStartMpTimestamp: null
    }),
    {
      shouldStop: false,
      shouldSkip: false,
      nextFrameCount: 8,
      nextAnalysisStartMpTimestamp: 150,
      elapsedMs: 0,
      nextLastMpTimestamp: 150
    }
  );
});

test('prepareAnalysisFrame preserves counts when the media gate skips a frame', () => {
  assert.deepEqual(
    prepareAnalysisFrame({
      isAnalyzing: true,
      readyState: 1,
      isVideoMode: false,
      isPaused: false,
      mpTimestamp: 150,
      lastMpTimestamp: 100,
      frameCount: 7,
      analysisStartMpTimestamp: 90
    }),
    {
      shouldStop: false,
      shouldSkip: true,
      nextFrameCount: 7,
      nextAnalysisStartMpTimestamp: 90,
      elapsedMs: null,
      nextLastMpTimestamp: 100
    }
  );
});
