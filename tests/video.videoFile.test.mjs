import test from 'node:test';
import assert from 'node:assert/strict';

import { configureVideoElementForFile, createVideoFileInput, startVideoPlaybackForAnalysis, waitForVideoLoad } from '../src/video/videoFile.js';

test('createVideoFileInput builds a file input configured for videos', () => {
  const input = createVideoFileInput({
    documentRef: {
      createElement(tag) {
        assert.equal(tag, 'input');
        return {};
      }
    }
  });

  assert.equal(input.type, 'file');
  assert.equal(input.accept, 'video/*');
});

test('configureVideoElementForFile applies the expected playback flags', () => {
  const attrs = [];
  const videoElement = {
    setAttribute(name, value) {
      attrs.push([name, value]);
    }
  };

  configureVideoElementForFile(videoElement);

  assert.equal(videoElement.playsInline, true);
  assert.equal(videoElement.preload, 'auto');
  assert.equal(videoElement.muted, true);
  assert.deepEqual(attrs, [['playsinline', '']]);
});

test('waitForVideoLoad resolves once dimensions are available', async () => {
  const listeners = new Map();
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {};
  let loadCalled = false;

  try {
    const videoElement = {
      readyState: 4,
      videoWidth: 1920,
      videoHeight: 1080,
      addEventListener(name, fn) {
        listeners.set(name, fn);
      },
      removeEventListener(name) {
        listeners.delete(name);
      },
      load() {
        loadCalled = true;
      },
      src: '',
      loop: true
    };

    const promise = waitForVideoLoad({
      videoElement,
      src: 'blob:video',
      timeoutMs: 10,
      logger: { log() {}, warn() {}, error() {} }
    });

    await promise;
    assert.equal(loadCalled, true);
    assert.equal(videoElement.src, 'blob:video');
    assert.equal(videoElement.loop, false);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});

test('waitForVideoLoad rejects invalid inputs', async () => {
  await assert.rejects(() => waitForVideoLoad({
    videoElement: null,
    src: '',
    logger: { log() {}, warn() {}, error() {} }
  }));
});

test('startVideoPlaybackForAnalysis resets playback and stamps the epoch base', async () => {
  let playCalled = false;
  const result = await startVideoPlaybackForAnalysis({
    videoElement: {
      currentTime: 42,
      ended: false,
      async play() {
        playCalled = true;
      }
    },
    logger: { log() {} },
    now: () => 123456
  });

  assert.equal(playCalled, true);
  assert.deepEqual(result, { videoEpochBaseMs: 123456 });
});

test('startVideoPlaybackForAnalysis reloads ended videos before playing', async () => {
  const calls = [];
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    fn();
    return 1;
  };

  try {
    const videoElement = {
      currentTime: 8,
      ended: true,
      load() {
        calls.push('load');
      },
      async play() {
        calls.push('play');
      }
    };

    await startVideoPlaybackForAnalysis({
      videoElement,
      logger: { log() {} },
      now: () => 789
    });

    assert.equal(videoElement.currentTime, 0);
    assert.deepEqual(calls, ['load', 'play']);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});
