import test from 'node:test';
import assert from 'node:assert/strict';

import { buildCameraConstraints, inferFacingModeFromLabel, listAvailableVideoInputs, releaseCameraResources, shouldRestartCameraForOrientationChange, startCameraStreamWithFallbacks, stopMediaStream, waitForVideoMetadataAndPlay } from '../src/video/camera.js';

test('buildCameraConstraints prefers portrait ratio on tall viewports', () => {
  const constraints = buildCameraConstraints({ windowWidth: 600, windowHeight: 900 });
  assert.equal(constraints[0].video.aspectRatio.ideal, 9 / 16);
  assert.deepEqual(constraints[0].video.facingMode, { ideal: 'environment' });
  assert.equal(constraints[0].video.height.ideal, 1920);
  assert.deepEqual(constraints[2], { video: true });
});

test('buildCameraConstraints prioritizes requested camera device and facing mode', () => {
  const constraints = buildCameraConstraints({
    windowWidth: 1024,
    windowHeight: 768,
    preferredFacingMode: 'user',
    preferredDeviceId: 'camera-front'
  });

  assert.deepEqual(constraints[0].video.deviceId, { exact: 'camera-front' });
  assert.deepEqual(constraints[0].video.facingMode, { ideal: 'user' });
  assert.deepEqual(constraints[2].video.facingMode, { ideal: 'environment' });
});

test('inferFacingModeFromLabel derives front and back camera hints from labels', () => {
  assert.equal(inferFacingModeFromLabel('Front Camera'), 'user');
  assert.equal(inferFacingModeFromLabel('Back Ultra Wide Camera'), 'environment');
  assert.equal(inferFacingModeFromLabel('USB Camera'), 'unknown');
});

test('listAvailableVideoInputs returns normalized camera options', async () => {
  const cameras = await listAvailableVideoInputs({
    mediaDevices: {
      async enumerateDevices() {
        return [
          { kind: 'audioinput', deviceId: 'mic-1', label: 'Mic' },
          { kind: 'videoinput', deviceId: 'cam-1', label: 'Front Camera' },
          { kind: 'videoinput', deviceId: 'cam-2', label: '' }
        ];
      }
    }
  });

  assert.deepEqual(cameras, [
    { deviceId: 'cam-1', label: 'Front Camera', facingMode: 'user' },
    { deviceId: 'cam-2', label: 'カメラ 2', facingMode: 'unknown' }
  ]);
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

test('waitForVideoMetadataAndPlay rejects invalid video element', async () => {
  await assert.rejects(
    waitForVideoMetadataAndPlay({ videoElement: null }),
    /Invalid video element/
  );
});

test('waitForVideoMetadataAndPlay rejects invalid timeout', async () => {
  await assert.rejects(
    waitForVideoMetadataAndPlay({
      videoElement: { async play() {} },
      timeoutMs: 0
    }),
    /Invalid timeout/
  );
});

test('waitForVideoMetadataAndPlay resolves immediately when metadata is already available', async () => {
  let played = false;
  await waitForVideoMetadataAndPlay({
    videoElement: {
      readyState: 2,
      async play() { played = true; }
    }
  });
  assert.equal(played, true);
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

test('startCameraStreamWithFallbacks validates required inputs', async () => {
  await assert.rejects(
    startCameraStreamWithFallbacks({
      mediaDevices: null,
      videoElement: {},
      constraints: [{ video: true }]
    }),
    /MediaDevices\.getUserMedia is unavailable/
  );

  await assert.rejects(
    startCameraStreamWithFallbacks({
      mediaDevices: { async getUserMedia() {} },
      videoElement: null,
      constraints: [{ video: true }]
    }),
    /Video element is required/
  );

  await assert.rejects(
    startCameraStreamWithFallbacks({
      mediaDevices: { async getUserMedia() {} },
      videoElement: {},
      constraints: []
    }),
    /At least one camera constraint is required/
  );

  await assert.rejects(
    startCameraStreamWithFallbacks({
      mediaDevices: { async getUserMedia() {} },
      videoElement: {},
      constraints: [{ video: true }],
      timeoutMs: 0
    }),
    /Invalid timeout/
  );
});

test('startCameraStreamWithFallbacks stops failed stream before retrying constraints', async () => {
  const stopped = [];
  const firstStream = {
    getTracks() {
      return [{ stop() { stopped.push('first'); } }];
    }
  };
  const secondStream = { id: 'stream-2' };
  const videoElement = { srcObject: null };
  let callCount = 0;

  const result = await startCameraStreamWithFallbacks({
    mediaDevices: {
      async getUserMedia() {
        callCount += 1;
        return callCount === 1 ? firstStream : secondStream;
      }
    },
    videoElement,
    constraints: [{ video: { width: 1 } }, { video: { width: 2 } }],
    waitForVideoMetadataAndPlayFn: async ({ videoElement: targetVideoElement }) => {
      if (targetVideoElement.srcObject === firstStream) {
        throw new Error('play failed');
      }
    },
    logger: { log() {} }
  });

  assert.equal(result, secondStream);
  assert.deepEqual(stopped, ['first']);
  assert.equal(videoElement.srcObject, secondStream);
});

test('startCameraStreamWithFallbacks does not stop an unrelated existing stream when getUserMedia fails early', async () => {
  const stopped = [];
  const existingStream = {
    getTracks() {
      return [{ stop() { stopped.push('existing'); } }];
    }
  };
  const videoElement = { srcObject: existingStream };

  await assert.rejects(
    startCameraStreamWithFallbacks({
      mediaDevices: {
        async getUserMedia() {
          throw new Error('permission denied');
        }
      },
      videoElement,
      constraints: [{ video: true }],
      waitForVideoMetadataAndPlayFn: async () => {},
      logger: { log() {} }
    }),
    /permission denied/
  );

  assert.deepEqual(stopped, []);
  assert.equal(videoElement.srcObject, existingStream);
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
