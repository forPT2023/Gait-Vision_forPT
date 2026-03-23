import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCameraConstraints, releaseCameraResources, shouldRestartCameraForOrientationChange, startCameraStreamWithFallbacks, stopMediaStream, waitForVideoMetadataAndPlay } from '../src/video/camera.js';

test('buildCameraConstraints prefers portrait ratio on tall viewports', () => {
  const constraints = buildCameraConstraints({ windowWidth: 600, windowHeight: 900 });
  assert.equal(constraints[0].video.aspectRatio.ideal, 9 / 16);
  assert.deepEqual(constraints[0].video.facingMode, { ideal: 'environment' });
  assert.equal(constraints[0].video.height.ideal, 1920);
  assert.deepEqual(constraints[2], { video: true });
});

test('stopMediaStream stops every track when a stream is present', () => {
  const stopped = [];
  stopMediaStream({
    getTracks() {
      return [
        { stop() { stopped.push('a'); } },
        { stop() { stopped.push('b'); } }
      ];
    }
  });
  assert.deepEqual(stopped, ['a', 'b']);
});

test('shouldRestartCameraForOrientationChange only allows safe preview restarts', () => {
  assert.equal(shouldRestartCameraForOrientationChange({
    hasMediaStream: true,
    isRecording: false,
    isAnalyzing: false,
    sourceMode: 'camera'
  }), true);

  assert.equal(shouldRestartCameraForOrientationChange({
    hasMediaStream: true,
    isRecording: true,
    isAnalyzing: false,
    sourceMode: 'camera'
  }), false);

  assert.equal(shouldRestartCameraForOrientationChange({
    hasMediaStream: true,
    isRecording: false,
    isAnalyzing: false,
    sourceMode: 'video'
  }), false);
});

test('waitForVideoMetadataAndPlay resolves after play succeeds', async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {};

  try {
    const videoElement = {
      async play() {},
      onloadedmetadata: null
    };

    const promise = waitForVideoMetadataAndPlay({ videoElement, timeoutMs: 10 });
    await videoElement.onloadedmetadata();
    await promise;
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test('startCameraStreamWithFallbacks retries constraints until one succeeds', async () => {
  const calls = [];
  const stream = { id: 'stream-1' };
  const videoElement = { srcObject: null };

  const result = await startCameraStreamWithFallbacks({
    mediaDevices: {
      async getUserMedia(constraint) {
        calls.push(constraint);
        if (calls.length === 1) throw new Error('first failed');
        return stream;
      }
    },
    videoElement,
    constraints: [{ video: { width: 1 } }, { video: { width: 2 } }],
    waitForVideoMetadataAndPlayFn: async () => {},
    logger: { log() {} }
  });

  assert.equal(result, stream);
  assert.equal(videoElement.srcObject, stream);
  assert.equal(calls.length, 2);
});

test('releaseCameraResources clears stream, canvas, preview loop, and ui state', () => {
  const stopped = [];
  const cancelled = [];
  const canvasCalls = [];
  const cameraButton = {
    textContent: '',
    classList: {
      remove(value) { cancelled.push(`remove:${value}`); },
      add(value) { cancelled.push(`add:${value}`); }
    }
  };
  const recordButton = { disabled: false };
  const result = releaseCameraResources({
    previewAnimationId: 123,
    cancelAnimationFrameFn(id) { cancelled.push(`cancel:${id}`); },
    mediaStream: {
      getTracks() {
        return [{ stop() { stopped.push('track'); } }];
      }
    },
    videoElement: { srcObject: 'stream' },
    canvasCtx: { clearRect(...args) { canvasCalls.push(args); } },
    canvasElement: { width: 640, height: 480 },
    chartController: { pauseCharts() { cancelled.push('pauseCharts'); } },
    cameraButton,
    recordButton
  });

  assert.deepEqual(result, { previewAnimationId: null, mediaStream: null });
  assert.deepEqual(stopped, ['track']);
  assert.ok(cancelled.includes('cancel:123'));
  assert.ok(cancelled.includes('pauseCharts'));
  assert.deepEqual(canvasCalls, [[0, 0, 640, 480]]);
  assert.equal(cameraButton.textContent, '📷 カメラ');
  assert.equal(recordButton.disabled, true);
});
