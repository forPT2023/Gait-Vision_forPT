import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnalysisCsv,
  buildCsvExportFilename,
  buildPdfReportFilename,
  downloadBlobFile,
  formatCompactDate,
  shareOrDownloadBlob
} from '../src/storage/export.js';

test('formatCompactDate returns YYYYMMDD for a UTC date', () => {
  assert.equal(
    formatCompactDate({ date: new Date('2026-03-23T12:34:56.000Z') }),
    '20260323'
  );
});

test('buildCsvExportFilename uses the shared compact date stamp', () => {
  assert.equal(
    buildCsvExportFilename({
      patientId: 'PT-0003',
      date: new Date('2026-03-23T12:34:56.000Z')
    }),
    'gait_PT-0003_20260323.csv'
  );
});

test('buildPdfReportFilename uses the shared compact date stamp', () => {
  assert.equal(
    buildPdfReportFilename({
      patientId: 'PT-0003',
      date: new Date('2026-03-23T12:34:56.000Z')
    }),
    'gait_report_PT-0003_20260323.pdf'
  );
});

test('buildCsvExportFilename sanitizes unsafe patient id characters', () => {
  assert.equal(
    buildCsvExportFilename({
      patientId: 'PT/00:03 *A?',
      date: new Date('2026-03-23T12:34:56.000Z')
    }),
    'gait_PT_00_03_A__20260323.csv'
  );
});

test('buildPdfReportFilename falls back when patient id is empty', () => {
  assert.equal(
    buildPdfReportFilename({
      patientId: '   ',
      date: new Date('2026-03-23T12:34:56.000Z')
    }),
    'gait_report_unknown_20260323.pdf'
  );
});

test('buildCsvExportFilename falls back when sanitization removes entire segment', () => {
  assert.equal(
    buildCsvExportFilename({
      patientId: '....',
      date: new Date('2026-03-23T12:34:56.000Z')
    }),
    'gait_unknown_20260323.csv'
  );
});

test('buildAnalysisCsv formats header, BOM, and metric rows', () => {
  const csv = buildAnalysisCsv([
    {
      elapsedMs: 123.6,
      speed: 1.23456,
      cadence: 98.76,
      symmetry: 87.65,
      trunk: 1.234,
      pelvis: 2.345,
      leftKnee: 10.123,
      rightKnee: 11.987,
      leftHip: 12.111,
      rightHip: 13.222,
      leftAnkle: 14.333,
      rightAnkle: 15.444
    }
  ]);

  assert.equal(
    csv,
    '\uFEFFelapsed_ms,speed_m_s,cadence_spm,symmetry_pct,trunk_deg,pelvis_deg,left_knee_deg,right_knee_deg,left_hip_deg,right_hip_deg,left_ankle_deg,right_ankle_deg\n'
      + '124,1.235,98.8,87.7,1.23,2.35,10.12,11.99,12.11,13.22,14.33,15.44\n'
  );
});

test('buildAnalysisCsv normalizes missing and non-finite metrics to zero', () => {
  const csv = buildAnalysisCsv([
    {
      timestamp: Number.NaN,
      speed: undefined,
      cadence: null,
      symmetry: Number.POSITIVE_INFINITY,
      trunk: 'x',
      pelvis: -1.234,
      leftKnee: undefined,
      rightKnee: null,
      leftHip: Number.NaN,
      rightHip: undefined,
      leftAnkle: '7.1',
      rightAnkle: Number.NEGATIVE_INFINITY
    }
  ], { bom: '' });

  assert.equal(
    csv,
    'elapsed_ms,speed_m_s,cadence_spm,symmetry_pct,trunk_deg,pelvis_deg,left_knee_deg,right_knee_deg,left_hip_deg,right_hip_deg,left_ankle_deg,right_ankle_deg\n'
      + '0,0.000,0.0,0.0,0.00,-1.23,0.00,0.00,0.00,0.00,7.10,0.00\n'
  );
});

test('buildAnalysisCsv returns header-only csv when analysisData is not an array', () => {
  const csv = buildAnalysisCsv(null, { bom: '' });
  assert.equal(
    csv,
    'elapsed_ms,speed_m_s,cadence_spm,symmetry_pct,trunk_deg,pelvis_deg,left_knee_deg,right_knee_deg,left_hip_deg,right_hip_deg,left_ankle_deg,right_ankle_deg\n'
  );
});

test('buildAnalysisCsv handles sparse/undefined rows without throwing', () => {
  const csv = buildAnalysisCsv([undefined], { bom: '' });
  assert.equal(
    csv,
    'elapsed_ms,speed_m_s,cadence_spm,symmetry_pct,trunk_deg,pelvis_deg,left_knee_deg,right_knee_deg,left_hip_deg,right_hip_deg,left_ankle_deg,right_ankle_deg\n'
      + '0,0.000,0.0,0.0,0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00\n'
  );
});

test('downloadBlobFile clicks a generated blob URL and revokes it later', () => {
  let created = null;
  let revoked = null;
  let clicked = false;
  let appended = 0;
  let removed = 0;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    fn();
    return 1;
  };

  try {
    downloadBlobFile({
      blob: { size: 7 },
      filename: 'demo.csv',
      URLRef: {
        createObjectURL(blob) {
          created = blob;
          return 'blob:export';
        },
        revokeObjectURL(url) {
          revoked = url;
        }
      },
      documentRef: {
        body: {
          appendChild() {
            appended += 1;
          }
        },
        createElement(tag) {
          assert.equal(tag, 'a');
          return {
            href: '',
            download: '',
            isConnected: false,
            parentNode: {
              removeChild() {
                removed += 1;
              }
            },
            click() {
              clicked = true;
            }
          };
        }
      },
      revokeDelayMs: 12
    });
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }

  assert.deepEqual(created, { size: 7 });
  assert.equal(revoked, 'blob:export');
  assert.equal(clicked, true);
  assert.equal(appended, 1);
  assert.equal(removed, 1);
});

test('downloadBlobFile rejects when URL or document APIs are unavailable', () => {
  assert.throws(
    () => downloadBlobFile({
      blob: { size: 1 },
      filename: 'x.csv',
      URLRef: null,
      documentRef: { createElement() {} }
    }),
    /URL API is unavailable/
  );

  assert.throws(
    () => downloadBlobFile({
      blob: { size: 1 },
      filename: 'x.csv',
      URLRef: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
      documentRef: null
    }),
    /Document API is unavailable/
  );

  assert.throws(
    () => downloadBlobFile({
      blob: { size: 1 },
      filename: '   ',
      URLRef: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
      documentRef: { createElement() { return { click() {} }; } }
    }),
    /Filename is required/
  );

  assert.throws(
    () => downloadBlobFile({
      blob: null,
      filename: 'x.csv',
      URLRef: { createObjectURL() { return 'blob:x'; }, revokeObjectURL() {} },
      documentRef: { createElement() { return { click() {} }; } }
    }),
    /Blob payload is required/
  );
});

test('downloadBlobFile still cleans up and revokes URL when click throws', () => {
  let revoked = null;
  let removed = 0;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    fn();
    return 1;
  };

  try {
    assert.throws(
      () => downloadBlobFile({
        blob: { size: 1 },
        filename: 'x.csv',
        URLRef: {
          createObjectURL() {
            return 'blob:oops';
          },
          revokeObjectURL(url) {
            revoked = url;
          }
        },
        documentRef: {
          body: {
            appendChild() {}
          },
          createElement() {
            return {
              isConnected: false,
              parentNode: {
                removeChild() {
                  removed += 1;
                }
              },
              click() {
                throw new Error('click failed');
              }
            };
          }
        }
      }),
      /click failed/
    );
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }

  assert.equal(removed, 1);
  assert.equal(revoked, 'blob:oops');
});

test('downloadBlobFile removes appended link via document body when parentNode is unavailable', () => {
  let removed = 0;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    fn();
    return 1;
  };

  try {
    downloadBlobFile({
      blob: { size: 1 },
      filename: 'x.csv',
      URLRef: {
        createObjectURL() {
          return 'blob:test';
        },
        revokeObjectURL() {}
      },
      documentRef: {
        body: {
          appendChild() {},
          removeChild() {
            removed += 1;
          }
        },
        createElement() {
          return {
            isConnected: false,
            click() {}
          };
        }
      }
    });
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }

  assert.equal(removed, 1);
});

// ────────────────────────────────────────────────────────────────────────────
// shareOrDownloadBlob tests
// ────────────────────────────────────────────────────────────────────────────

test('shareOrDownloadBlob uses navigator.share on iOS when canShare returns true', async () => {
  let sharedFiles = null;
  const navigatorRef = {
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    canShare(data) { return Array.isArray(data?.files) && data.files.length > 0; },
    async share(data) { sharedFiles = data.files; }
  };
  const URLRef = {
    createObjectURL() { return 'blob:x'; },
    revokeObjectURL() {}
  };
  const documentRef = {
    body: { appendChild() {}, removeChild() {} },
    createElement() { return { href: '', download: '', isConnected: false, click() {} }; }
  };

  const blob = new Blob(['hello'], { type: 'video/mp4' });
  const result = await shareOrDownloadBlob({
    blob,
    filename: 'test.mp4',
    URLRef,
    documentRef,
    navigatorRef
  });

  assert.equal(result, 'shared');
  assert.ok(Array.isArray(sharedFiles));
  assert.equal(sharedFiles.length, 1);
  assert.equal(sharedFiles[0].name, 'test.mp4');
});

test('shareOrDownloadBlob uses navigator.share when forceShare=true even on non-iOS', async () => {
  let sharedFiles = null;
  const navigatorRef = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    canShare(data) { return Array.isArray(data?.files) && data.files.length > 0; },
    async share(data) { sharedFiles = data.files; }
  };
  const URLRef = {
    createObjectURL() { return 'blob:x'; },
    revokeObjectURL() {}
  };
  const documentRef = {
    body: { appendChild() {}, removeChild() {} },
    createElement() { return { href: '', download: '', isConnected: false, click() {} }; }
  };

  const blob = new Blob(['hello'], { type: 'video/mp4' });
  const result = await shareOrDownloadBlob({
    blob,
    filename: 'test.mp4',
    forceShare: true,
    URLRef,
    documentRef,
    navigatorRef
  });

  assert.equal(result, 'shared');
  assert.ok(Array.isArray(sharedFiles));
  assert.equal(sharedFiles[0].name, 'test.mp4');
});

test('shareOrDownloadBlob falls back to download on non-iOS even when canShare returns true', async () => {
  let clicked = false;
  const navigatorRef = {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    canShare(data) { return Array.isArray(data?.files) && data.files.length > 0; },
    async share() {}
  };
  const URLRef = {
    createObjectURL() { return 'blob:x'; },
    revokeObjectURL() {}
  };
  const documentRef = {
    body: { appendChild() {} },
    createElement() {
      return {
        href: '', download: '', isConnected: false,
        parentNode: { removeChild() {} },
        click() { clicked = true; }
      };
    }
  };

  const blob = new Blob(['hello'], { type: 'video/mp4' });
  const result = await shareOrDownloadBlob({
    blob,
    filename: 'test.mp4',
    URLRef,
    documentRef,
    navigatorRef
  });

  assert.equal(result, 'downloaded');
  assert.ok(clicked);
});

test('shareOrDownloadBlob falls back to download when canShare returns false', async () => {
  let clicked = false;
  const navigatorRef = {
    canShare() { return false; },
    async share() {}
  };
  const URLRef = {
    createObjectURL() { return 'blob:x'; },
    revokeObjectURL() {}
  };
  const documentRef = {
    body: { appendChild() {} },
    createElement() {
      return {
        href: '', download: '', isConnected: false,
        parentNode: { removeChild() {} },
        click() { clicked = true; }
      };
    }
  };

  const blob = new Blob(['hello'], { type: 'video/mp4' });
  const result = await shareOrDownloadBlob({
    blob,
    filename: 'test.mp4',
    URLRef,
    documentRef,
    navigatorRef
  });

  assert.equal(result, 'downloaded');
  assert.ok(clicked);
});

test('shareOrDownloadBlob falls back to download when navigator.share is unavailable', async () => {
  let clicked = false;
  const navigatorRef = {}; // no share/canShare
  const URLRef = {
    createObjectURL() { return 'blob:x'; },
    revokeObjectURL() {}
  };
  const documentRef = {
    body: { appendChild() {} },
    createElement() {
      return {
        href: '', download: '', isConnected: false,
        parentNode: { removeChild() {} },
        click() { clicked = true; }
      };
    }
  };

  const blob = new Blob(['hello'], { type: 'video/mp4' });
  const result = await shareOrDownloadBlob({
    blob,
    filename: 'test.mp4',
    URLRef,
    documentRef,
    navigatorRef
  });

  assert.equal(result, 'downloaded');
  assert.ok(clicked);
});

test('shareOrDownloadBlob throws when blob is null', async () => {
  await assert.rejects(
    () => shareOrDownloadBlob({ blob: null, filename: 'x.mp4' }),
    /Blob payload is required/
  );
});

test('shareOrDownloadBlob throws when filename is empty', async () => {
  await assert.rejects(
    () => shareOrDownloadBlob({ blob: new Blob(['a']), filename: '' }),
    /Filename is required/
  );
});
