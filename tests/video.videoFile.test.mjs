import test from 'node:test';
import assert from 'node:assert/strict';

import { configureVideoElementForFile, createVideoFileInput, disposeVideoFileInput, startVideoPlaybackForAnalysis, triggerVideoFilePicker, waitForVideoLoad } from '../src/video/videoFile.js';

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
  assert.equal(input.multiple, false);
});

test('createVideoFileInput throws when documentRef is unavailable', () => {
  const originalDocument = globalThis.document;
  globalThis.document = undefined;
  try {
    assert.throws(() => createVideoFileInput(), /Document reference is required/);
  } finally {
    globalThis.document = originalDocument;
  }
});

test('triggerVideoFilePicker appends detached input and uses showPicker when available', () => {
  const appended = [];
  const input = {
    isConnected: false,
    style: {},
    value: 'dummy',
    showPickerCalled: false,
    showPicker() {
      this.showPickerCalled = true;
    }
  };

  const triggerMethod = triggerVideoFilePicker({
    input,
    documentRef: {
      body: {
        appendChild(node) {
          appended.push(node);
        }
      }
    },
    logger: { warn() {} }
  });
  assert.equal(triggerMethod, 'showPicker');
  assert.equal(appended.length, 1);
  assert.equal(input.showPickerCalled, true);
  assert.equal(input.value, '');
});

test('triggerVideoFilePicker falls back to click when showPicker fails', () => {
  const input = {
    isConnected: true,
    style: {},
    value: 'dummy',
    clickCalled: false,
    showPicker() {
      throw new Error('Unsupported');
    },
    click() {
      this.clickCalled = true;
    }
  };

  const triggerMethod = triggerVideoFilePicker({
    input,
    logger: { warn() {} }
  });

  assert.equal(triggerMethod, 'click');
  assert.equal(input.clickCalled, true);
  assert.equal(input.value, '');
});

test('disposeVideoFileInput removes input from DOM', () => {
  let removed = false;
  const input = {
    parentNode: {
      removeChild(node) {
        assert.equal(node, input);
        removed = true;
      }
    }
  };

  disposeVideoFileInput({ input });
  assert.equal(removed, true);
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
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {};
  globalThis.setInterval = () => 2;
  globalThis.clearInterval = () => {};
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
      removeAttribute() {},
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
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test('waitForVideoLoad polling fallback resolves when readiness appears later', async () => {
  const listeners = new Map();
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const intervals = [];
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {};
  globalThis.setInterval = (fn) => {
    intervals.push(fn);
    return 7;
  };
  globalThis.clearInterval = () => {};

  try {
    const videoElement = {
      readyState: 0,
      videoWidth: 0,
      videoHeight: 0,
      duration: Number.NaN,
      addEventListener(name, fn) {
        listeners.set(name, fn);
      },
      removeEventListener(name) {
        listeners.delete(name);
      },
      load() {},
      removeAttribute() {},
      src: '',
      loop: true
    };

    const promise = waitForVideoLoad({
      videoElement,
      src: 'blob:video',
      timeoutMs: 10,
      logger: { log() {}, warn() {}, error() {} }
    });

    videoElement.readyState = 1;
    videoElement.videoWidth = 1280;
    videoElement.videoHeight = 720;
    intervals[0]();

    await promise;
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test('waitForVideoLoad resolves for mobile videos that decode frames before dimensions are available', async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {};
  globalThis.setInterval = () => 2;
  globalThis.clearInterval = () => {};

  try {
    const videoElement = {
      readyState: 2,
      videoWidth: 0,
      videoHeight: 0,
      duration: 8.5,
      addEventListener() {},
      removeEventListener() {},
      load() {},
      removeAttribute() {},
      src: '',
      loop: true
    };

    await waitForVideoLoad({
      videoElement,
      src: 'blob:mobile-video',
      timeoutMs: 10,
      logger: { log() {}, warn() {}, error() {} }
    });
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test('waitForVideoLoad rejects invalid inputs', async () => {
  await assert.rejects(() => waitForVideoLoad({
    videoElement: null,
    src: '',
    logger: { log() {}, warn() {}, error() {} }
  }));
});

test('waitForVideoLoad rejects invalid timeout', async () => {
  await assert.rejects(() => waitForVideoLoad({
    videoElement: {
      readyState: 0,
      videoWidth: 0,
      videoHeight: 0,
      duration: Number.NaN,
      addEventListener() {},
      removeEventListener() {},
      load() {},
      removeAttribute() {},
      src: ''
    },
    src: 'blob:video',
    timeoutMs: 0,
    logger: { log() {}, warn() {}, error() {} }
  }), /Invalid timeout/);
});

test('waitForVideoLoad timeout log includes configured timeout seconds', async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  let timeoutFn = null;
  const logs = [];
  globalThis.setTimeout = (fn) => {
    timeoutFn = fn;
    return 1;
  };
  globalThis.clearTimeout = () => {};
  globalThis.setInterval = () => 2;
  globalThis.clearInterval = () => {};

  try {
    const pending = waitForVideoLoad({
      videoElement: {
        readyState: 0,
        videoWidth: 0,
        videoHeight: 0,
        duration: Number.NaN,
        addEventListener() {},
        removeEventListener() {},
        load() {},
        removeAttribute() {},
        src: ''
      },
      src: 'blob:video',
      timeoutMs: 12000,
      logger: { log() {}, warn() {}, error(message) { logs.push(message); } }
    });

    timeoutFn();
    await assert.rejects(() => pending, /Timeout/);
    assert.match(logs[0], /12 seconds/);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test('waitForVideoLoad timeout cleans up listeners', async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  let timeoutFn = null;
  const removed = [];
  globalThis.setTimeout = (fn) => {
    timeoutFn = fn;
    return 1;
  };
  globalThis.clearTimeout = () => {};
  globalThis.setInterval = () => 2;
  globalThis.clearInterval = () => {};

  try {
    const pending = waitForVideoLoad({
      videoElement: {
        readyState: 0,
        videoWidth: 0,
        videoHeight: 0,
        duration: Number.NaN,
        addEventListener() {},
        removeEventListener(name) {
          removed.push(name);
        },
        load() {},
        removeAttribute() {},
        src: ''
      },
      src: 'blob:video',
      timeoutMs: 4000,
      logger: { log() {}, warn() {}, error() {} }
    });

    timeoutFn();
    await assert.rejects(() => pending, /Timeout/);
    assert.ok(removed.includes('loadedmetadata'));
    assert.ok(removed.includes('error'));
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test('waitForVideoLoad handles elements without addEventListener/removeEventListener', async () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  const originalSetInterval = globalThis.setInterval;
  const originalClearInterval = globalThis.clearInterval;
  const intervals = [];
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {};
  globalThis.setInterval = (fn) => {
    intervals.push(fn);
    return 2;
  };
  globalThis.clearInterval = () => {};

  try {
    const videoElement = {
      readyState: 0,
      videoWidth: 0,
      videoHeight: 0,
      duration: Number.NaN,
      load() {},
      removeAttribute() {},
      src: '',
      loop: true
    };

    const pending = waitForVideoLoad({
      videoElement,
      src: 'blob:no-events',
      timeoutMs: 2000,
      logger: { log() {}, warn() {}, error() {} }
    });

    videoElement.readyState = 2;
    videoElement.duration = 1;
    intervals[0]();
    await pending;
  } finally {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  }
});

test('startVideoPlaybackForAnalysis resets playback and stamps the epoch base', async () => {
  let playCalled = false;
  // Simulate a video element that fires 'playing' after play() resolves.
  const listeners = {};
  const videoElement = {
    currentTime: 42,
    ended: false,
    paused: true,
    addEventListener(event, fn) { listeners[event] = fn; },
    removeEventListener(event) { delete listeners[event]; },
    async play() {
      playCalled = true;
      this.paused = false;
      // Fire 'playing' synchronously to simulate browser behaviour.
      listeners['playing']?.();
    }
  };
  const result = await startVideoPlaybackForAnalysis({
    videoElement,
    logger: { log() {} },
    now: () => 123456
  });

  assert.equal(playCalled, true);
  assert.deepEqual(result, { videoEpochBaseMs: 123456 });
});

test('startVideoPlaybackForAnalysis resets currentTime and plays ended videos without calling load()', async () => {
  // load() must NOT be called: it resets the media pipeline and causes
  // a second canplay/loadeddata cycle which makes the video appear to play twice.
  const calls = [];
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    fn();
    return 1;
  };

  try {
    const listeners = {};
    const videoElement = {
      currentTime: 8,
      ended: true,
      paused: true,
      addEventListener(event, fn) { listeners[event] = fn; },
      removeEventListener(event) { delete listeners[event]; },
      load() {
        calls.push('load');
      },
      play() {
        calls.push('play');
        this.ended = false;
        this.paused = false;
        // Fire 'playing' synchronously to simulate the browser clearing ended state.
        listeners['playing']?.();
        return Promise.resolve();
      }
    };

    await startVideoPlaybackForAnalysis({
      videoElement,
      logger: { log() {} },
      now: () => 789
    });

    assert.equal(videoElement.currentTime, 0);
    // load() must not appear in the call sequence
    assert.deepEqual(calls, ['play']);
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }
});

test('startVideoPlaybackForAnalysis ignores duplicate starts while play() is still pending', async () => {
  let resolvePlay;
  let resolveListenerPlaying;
  let playCalls = 0;
  const listeners = {};
  const videoElement = {
    currentTime: 0,   // already at start so the seek-delay branch is skipped
    ended: false,
    paused: true,
    addEventListener(event, fn) { listeners[event] = fn; },
    removeEventListener(event) { delete listeners[event]; },
    play() {
      playCalls += 1;
      return new Promise((resolve) => {
        resolvePlay = resolve;
        // Provide a way for the test to fire 'playing' after play resolves.
        resolveListenerPlaying = () => { listeners['playing']?.(); };
      });
    }
  };

  const firstStart = startVideoPlaybackForAnalysis({
    videoElement,
    logger: { log() {}, warn() {} },
    now: () => 1000
  });
  const secondStart = await startVideoPlaybackForAnalysis({
    videoElement,
    logger: { log() {}, warn() {} },
    now: () => 1001
  });

  assert.equal(playCalls, 1);
  assert.equal(secondStart.playbackAlreadyStarting, true);

  // Resolve play() then fire 'playing' so firstStart can settle.
  resolvePlay();
  resolveListenerPlaying();
  await firstStart;
});

test('startVideoPlaybackForAnalysis does not restart when video is already playing', async () => {
  let playCalled = false;
  const result = await startVideoPlaybackForAnalysis({
    videoElement: {
      currentTime: 12,
      ended: false,
      paused: false,
      async play() {
        playCalled = true;
      }
    },
    logger: { log() {} },
    now: () => 456
  });

  assert.equal(playCalled, false);
  assert.equal(result.playbackAlreadyRunning, true);
});
