import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnalyzedVideoFilename,
  buildRecordingFilename,
  buildRecordingMetadata,
  closeSaveRecordingDialog,
  createCanvasRecordingSession,
  downloadBlob,
  formatRecordingInfoText,
  resetRecordedVideoState,
  selectRecordingMimeType,
  showSaveRecordingDialog
} from '../src/video/recording.js';

test('buildRecordingFilename uses patient id, date, and mime-derived extension', () => {
  assert.equal(
    buildRecordingFilename({
      patientId: 'PT-0001',
      mimeType: 'video/mp4',
      date: new Date('2026-03-23T12:00:00.000Z')
    }),
    'gait_PT-0001_20260323.mp4'
  );
});

test('buildAnalyzedVideoFilename uses the analyzed-video prefix', () => {
  assert.equal(
    buildAnalyzedVideoFilename({
      patientId: 'PT-0001',
      mimeType: 'video/webm',
      date: new Date('2026-03-23T12:00:00.000Z')
    }),
    'gait_analyzed_PT-0001_20260323.webm'
  );
});

test('buildRecordingMetadata computes size, format text, and filename', () => {
  const metadata = buildRecordingMetadata({
    recordedVideoBlob: { size: 3 * 1024 * 1024 },
    recordingMimeType: 'video/webm',
    patientId: 'PT-0002',
    date: new Date('2026-03-23T12:00:00.000Z')
  });

  assert.deepEqual(metadata, {
    sizeInMB: '3.00',
    formatText: 'WebM',
    filename: 'gait_PT-0002_20260323.webm'
  });
});

test('selectRecordingMimeType prefers MP4 and falls back to WebM', () => {
  const mp4Recorder = {
    isTypeSupported(type) {
      return type === 'video/mp4';
    }
  };
  const webmRecorder = {
    isTypeSupported(type) {
      return type === 'video/webm;codecs=vp9';
    }
  };
  const basicRecorder = {
    isTypeSupported() {
      return false;
    }
  };

  assert.equal(selectRecordingMimeType(mp4Recorder), 'video/mp4');
  assert.equal(selectRecordingMimeType(webmRecorder), 'video/webm;codecs=vp9');
  assert.equal(selectRecordingMimeType(basicRecorder), 'video/webm');
});

test('createCanvasRecordingSession builds a recorder with the selected mime type', () => {
  const created = [];
  class FakeRecorder {
    static isTypeSupported(type) {
      return type === 'video/mp4;codecs=h264';
    }

    constructor(stream, options) {
      created.push({ stream, options });
      this.stream = stream;
      this.options = options;
    }
  }

  const stream = { id: 'canvas-stream' };
  const result = createCanvasRecordingSession({
    stream,
    MediaRecorderCtor: FakeRecorder,
    videoBitsPerSecond: 1234
  });

  assert.equal(result.mimeType, 'video/mp4;codecs=h264');
  assert.equal(result.recorder.stream, stream);
  assert.deepEqual(created, [{
    stream,
    options: {
      mimeType: 'video/mp4;codecs=h264',
      videoBitsPerSecond: 1234
    }
  }]);
});

test('downloadBlob creates, clicks, and later revokes an object URL', () => {
  let created = null;
  let revoked = null;
  let clicked = false;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    fn();
    return 1;
  };

  try {
    downloadBlob({
      blob: { size: 1 },
      filename: 'demo.webm',
      URLRef: {
        createObjectURL(blob) {
          created = blob;
          return 'blob:demo';
        },
        revokeObjectURL(url) {
          revoked = url;
        }
      },
      documentRef: {
        createElement(tag) {
          assert.equal(tag, 'a');
          return {
            href: '',
            download: '',
            click() {
              clicked = true;
            }
          };
        }
      }
    });
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }

  assert.deepEqual(created, { size: 1 });
  assert.equal(revoked, 'blob:demo');
  assert.equal(clicked, true);
});

test('showSaveRecordingDialog writes metadata and opens the modal', () => {
  const size = { textContent: '' };
  const format = { textContent: '' };
  const filename = { textContent: '' };
  const modalCalls = [];

  showSaveRecordingDialog({
    documentRef: {
      getElementById(id) {
        if (id === 'recording-size') return size;
        if (id === 'recording-format') return format;
        if (id === 'recording-filename') return filename;
        if (id === 'save-recording-modal') {
          return { classList: { add(value) { modalCalls.push(['add', value]); } } };
        }
        return null;
      }
    },
    metadata: {
      sizeInMB: '1.25',
      formatText: 'MP4 (推奨)',
      filename: 'gait_PT-1_20260323.mp4'
    }
  });

  assert.equal(size.textContent, '1.25 MB');
  assert.equal(format.textContent, 'MP4 (推奨)');
  assert.equal(filename.textContent, 'gait_PT-1_20260323.mp4');
  assert.deepEqual(modalCalls, [['add', 'show']]);
});

test('closeSaveRecordingDialog hides the save-recording modal', () => {
  const calls = [];
  closeSaveRecordingDialog({
    documentRef: {
      getElementById(id) {
        assert.equal(id, 'save-recording-modal');
        return { classList: { remove(value) { calls.push(value); } } };
      }
    }
  });

  assert.deepEqual(calls, ['show']);
});

test('resetRecordedVideoState clears blob and recorded chunks', () => {
  assert.deepEqual(resetRecordedVideoState(), {
    recordedVideoBlob: null,
    recordedChunks: []
  });
});


test('formatRecordingInfoText returns the recording timer and point count label', () => {
  assert.equal(
    formatRecordingInfoText({
      elapsedSeconds: 65,
      pointCount: 42
    }),
    '⏺ 1:05 | 42点'
  );
});
