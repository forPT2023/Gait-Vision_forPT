import test from 'node:test';
import assert from 'node:assert/strict';

import {
  cancelScheduledHandle,
  cancelScheduledMediaWork,
  clearLoadedVideoState,
  findClosestAnalysisPoint,
  findInterpolatedAnalysisPoint,
  getPostAnalysisStopPlan,
  getAnalysisFrameGate,
  getMediaPipeTimestamp,
  getSourceMode,
  prepareAnalysisFrame,
  prepareForVideoLoad,
  scheduleAnalysisFrame,
  scheduleMediaWork,
  shouldSkipPreDraw,
  shouldSkipPostDraw
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

test('getMediaPipeTimestamp safely normalizes invalid video currentTime values', () => {
  assert.equal(
    getMediaPipeTimestamp({ hasStream: false, currentTime: Number.NaN, now: () => 9999 }),
    0
  );
  assert.equal(
    getMediaPipeTimestamp({ hasStream: false, currentTime: -2, now: () => 9999 }),
    0
  );
});

test('getMediaPipeTimestamp applies offset to video currentTime for monotonic continuity', () => {
  // Simulates a second analysis run: currentTime restarted from 0 but offset
  // ensures the timestamp continues from where the previous run left off.
  assert.equal(
    getMediaPipeTimestamp({ hasStream: false, currentTime: 0, now: () => 9999, offset: 31000 }),
    31000
  );
  assert.equal(
    getMediaPipeTimestamp({ hasStream: false, currentTime: 1.5, now: () => 9999, offset: 31000 }),
    32500
  );
});

test('getMediaPipeTimestamp offset is ignored for camera streams', () => {
  // Camera mode always uses wall-clock time; offset must not be applied.
  assert.equal(
    getMediaPipeTimestamp({ hasStream: true, currentTime: 0, now: () => 5000, offset: 99999 }),
    5000
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

test('findClosestAnalysisPoint safely handles non-array and non-finite elapsed inputs', () => {
  const points = [
    { elapsedMs: 100, value: 'a' },
    { elapsedMs: 200, value: 'b' }
  ];

  assert.equal(findClosestAnalysisPoint(null, 150), null);
  assert.deepEqual(findClosestAnalysisPoint(points, Number.NaN), points[0]);
});

test('findInterpolatedAnalysisPoint linearly interpolates landmarks between frames', () => {
  const points = [
    {
      elapsedMs: 0,
      timestamp: 1000,
      landmarks: [{ x: 0.1, y: 0.2, z: 0 }, { x: 0.3, y: 0.4, z: 0 }],
      worldLandmarks: [{ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }]
    },
    {
      elapsedMs: 1000,
      timestamp: 2000,
      landmarks: [{ x: 0.5, y: 0.6, z: 0.2 }, { x: 0.7, y: 0.8, z: 0.2 }],
      worldLandmarks: [{ x: 2, y: 2, z: 2 }, { x: 3, y: 3, z: 3 }]
    }
  ];

  const interpolated = findInterpolatedAnalysisPoint(points, 500);
  assert.ok(interpolated);
  assert.equal(interpolated.elapsedMs, 500);
  assert.ok(Math.abs(interpolated.landmarks[0].x - 0.3) < 1e-9);
  assert.ok(Math.abs(interpolated.landmarks[0].y - 0.4) < 1e-9);
  assert.equal(interpolated.timestamp, 1500);
  assert.equal(interpolated.worldLandmarks[0].x, 1);
  assert.equal(interpolated.worldLandmarks[1].z, 2);
});

test('findInterpolatedAnalysisPoint falls back to nearest point when interpolation is unavailable', () => {
  const points = [
    { elapsedMs: 0, landmarks: [{ x: 0, y: 0 }] },
    { elapsedMs: 1000, landmarks: [{ x: 1, y: 1 }, { x: 2, y: 2 }] }
  ];

  assert.deepEqual(findInterpolatedAnalysisPoint(points, 450), points[0]);
});

test('findInterpolatedAnalysisPoint clamps out-of-range elapsed values to boundary points', () => {
  const points = [
    { elapsedMs: 100, marker: 'start', landmarks: [{ x: 0, y: 0 }] },
    { elapsedMs: 500, marker: 'end', landmarks: [{ x: 1, y: 1 }] }
  ];

  assert.deepEqual(findInterpolatedAnalysisPoint(points, 50), points[0]);
  assert.deepEqual(findInterpolatedAnalysisPoint(points, 800), points[1]);
});

test('findInterpolatedAnalysisPoint falls back safely for non-finite elapsed values', () => {
  const points = [
    { elapsedMs: 0, marker: 'start', landmarks: [{ x: 0, y: 0 }] },
    { elapsedMs: 1000, marker: 'end', landmarks: [{ x: 1, y: 1 }] }
  ];

  assert.deepEqual(findInterpolatedAnalysisPoint(points, Number.NaN), points[0]);
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

test('getPostAnalysisStopPlan: video file mode with paused video should NOT trigger restartPreview', () => {
  // ビデオファイルモードで解析停止後:
  // restartPreview=false を確認する。
  // stopAllProcessing() は restartPreview=false の場合のみカメラプレビューを再起動すべきで、
  // ビデオファイルモードで startCameraPreview() を呼ぶとマーカー二重描画が発生する。
  const plan = getPostAnalysisStopPlan({
    hasStream: false,    // カメラなし（ビデオファイルモード）
    hasVideoSource: true,
    isVideoPaused: true, // 解析停止後に pause() 済み
    hasAnalysisData: true
  });
  assert.strictEqual(plan.restartPreview, false,
    'ビデオファイルモードでは restartPreview が false であること（startCameraPreview を呼ばない）');
  assert.strictEqual(plan.restoreVideoRecordButton, true,
    'ビデオファイルモードでは記録ボタンの復元は行うこと');
  assert.strictEqual(plan.enableExports, true,
    '解析データがある場合はエクスポートボタンを有効化すること');
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

// ── shouldSkipPreDraw ─────────────────────────────────────────────────────────

test('shouldSkipPreDraw skips when readyState < 2', () => {
  assert.deepEqual(shouldSkipPreDraw({ readyState: 1, isVideoMode: true, isPaused: false }), { skip: true, ended: false });
  assert.deepEqual(shouldSkipPreDraw({ readyState: 0, isVideoMode: false, isPaused: false }), { skip: true, ended: false });
});

test('shouldSkipPreDraw skips when video mode is paused', () => {
  assert.deepEqual(shouldSkipPreDraw({ readyState: 4, isVideoMode: true, isPaused: true }), { skip: true, ended: false });
});

test('shouldSkipPreDraw skips with ended=true when video is ended', () => {
  assert.deepEqual(shouldSkipPreDraw({ readyState: 4, isVideoMode: true, isPaused: true, isEnded: true }), { skip: true, ended: true });
  // ended takes priority over paused in video mode
  assert.deepEqual(shouldSkipPreDraw({ readyState: 2, isVideoMode: true, isPaused: false, isEnded: true }), { skip: true, ended: true });
});

test('shouldSkipPreDraw does not skip paused camera streams', () => {
  // Camera mode (isVideoMode=false) uses wall-clock time so paused state is irrelevant
  assert.deepEqual(shouldSkipPreDraw({ readyState: 4, isVideoMode: false, isPaused: true }), { skip: false, ended: false });
});

test('shouldSkipPreDraw does not flag ended for camera streams', () => {
  // isEnded only matters for video mode
  assert.deepEqual(shouldSkipPreDraw({ readyState: 4, isVideoMode: false, isPaused: false, isEnded: true }), { skip: false, ended: false });
});

test('shouldSkipPreDraw proceeds when readyState >= 2 and video is playing', () => {
  assert.deepEqual(shouldSkipPreDraw({ readyState: 2, isVideoMode: true, isPaused: false }), { skip: false, ended: false });
  assert.deepEqual(shouldSkipPreDraw({ readyState: 4, isVideoMode: true, isPaused: false }), { skip: false, ended: false });
});

// ── shouldSkipPostDraw ────────────────────────────────────────────────────────

test('shouldSkipPostDraw skips when detectTimestamp <= lastMpTimestamp in video mode', () => {
  assert.equal(shouldSkipPostDraw({ isVideoMode: true, detectTimestamp: 100, lastMpTimestamp: 100 }), true);
  assert.equal(shouldSkipPostDraw({ isVideoMode: true, detectTimestamp: 99, lastMpTimestamp: 100 }), true);
});

test('shouldSkipPostDraw proceeds when detectTimestamp > lastMpTimestamp in video mode', () => {
  assert.equal(shouldSkipPostDraw({ isVideoMode: true, detectTimestamp: 101, lastMpTimestamp: 100 }), false);
});

test('shouldSkipPostDraw never skips in camera mode (wall-clock always increases)', () => {
  // Camera uses performance.now() which is always strictly increasing, so no need to guard
  assert.equal(shouldSkipPostDraw({ isVideoMode: false, detectTimestamp: 100, lastMpTimestamp: 100 }), false);
  assert.equal(shouldSkipPostDraw({ isVideoMode: false, detectTimestamp: 50, lastMpTimestamp: 100 }), false);
});

test('shouldSkipPostDraw uses detectTimestamp (post-draw) not mpTimestamp (pre-draw)', () => {
  // This is the key asymmetry fix: post-draw gate uses the timestamp captured
  // AFTER drawImage, which correctly reflects the video frame on the canvas.
  // A stale pre-draw mpTimestamp could be <= lastMpTimestamp even when the
  // canvas has advanced to a new frame.
  const lastMpTimestamp = 1000;
  const detectTimestamp = 1033; // 33 ms later (one frame at 30 fps)
  assert.equal(shouldSkipPostDraw({ isVideoMode: true, detectTimestamp, lastMpTimestamp }), false);
});
