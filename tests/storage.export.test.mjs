import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAnalysisCsv,
  buildCsvExportFilename,
  buildPdfReportFilename,
  buildSessionExport,
  createBackupFilename,
  downloadBlobFile,
  downloadJson,
  formatCompactDate
} from '../src/storage/export.js';

test('buildSessionExport returns metadata and session count', () => {
  const payload = buildSessionExport({
    sessions: [{ id: 1 }, { id: 2 }],
    exportDate: '2026-03-23T00:00:00.000Z',
    version: 'test-version'
  });

  assert.deepEqual(payload, {
    exportDate: '2026-03-23T00:00:00.000Z',
    version: 'test-version',
    totalSessions: 2,
    sessions: [{ id: 1 }, { id: 2 }]
  });
});

test('createBackupFilename formats the date as YYYYMMDD', () => {
  assert.equal(
    createBackupFilename({ date: new Date('2026-03-23T12:34:56.000Z') }),
    'gait_backup_20260323.json'
  );
});

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

test('downloadBlobFile clicks a generated blob URL and revokes it later', () => {
  let created = null;
  let revoked = null;
  let clicked = false;
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
      },
      revokeDelayMs: 12
    });
  } finally {
    globalThis.setTimeout = originalSetTimeout;
  }

  assert.deepEqual(created, { size: 7 });
  assert.equal(revoked, 'blob:export');
  assert.equal(clicked, true);
});

test('downloadJson serializes payload and delegates to downloadBlobFile behavior', () => {
  let createdBlob = null;
  let revoked = null;
  let clicked = false;
  const originalSetTimeout = globalThis.setTimeout;
  globalThis.setTimeout = (fn) => {
    fn();
    return 1;
  };

  try {
    downloadJson({
      payload: { hello: 'world' },
      filename: 'backup.json',
      URLRef: {
        createObjectURL(blob) {
          createdBlob = blob;
          return 'blob:json';
        },
        revokeObjectURL(url) {
          revoked = url;
        }
      },
      documentRef: {
        createElement() {
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

  assert.equal(createdBlob.type, 'application/json');
  assert.equal(revoked, 'blob:json');
  assert.equal(clicked, true);
});
