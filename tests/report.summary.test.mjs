import test from 'node:test';
import assert from 'node:assert/strict';

import {
  averageMetric,
  createReportSummary,
  evaluateDifferenceStatus,
  evaluateMetricStatus
} from '../src/report/summary.js';

const sampleData = [
  {
    elapsedMs: 0,
    speed: 0,
    cadence: 0,
    symmetry: 95,
    trunk: 8,
    pelvis: 5,
    leftKnee: 0,
    rightKnee: 0,
    leftHip: 0,
    rightHip: 0,
    leftAnkle: 0,
    rightAnkle: 0
  },
  {
    elapsedMs: 1000,
    speed: 1.0,
    cadence: 110,
    symmetry: 96,
    trunk: 9,
    pelvis: 6,
    leftKnee: 40,
    rightKnee: 42,
    leftHip: 25,
    rightHip: 26,
    leftAnkle: 95,
    rightAnkle: 97
  },
  {
    elapsedMs: 2000,
    speed: 1.2,
    cadence: 118,
    symmetry: 94,
    trunk: 10,
    pelvis: 7,
    leftKnee: 44,
    rightKnee: 43,
    leftHip: 28,
    rightHip: 27,
    leftAnkle: 98,
    rightAnkle: 99
  }
];

test('averageMetric can exclude zero placeholder values', () => {
  assert.equal(averageMetric(sampleData, 'speed', { excludeZero: true }), 1.1);
  assert.equal(averageMetric(sampleData, 'speed'), (0 + 1.0 + 1.2) / 3);
});

test('evaluateMetricStatus and evaluateDifferenceStatus return expected tones', () => {
  assert.deepEqual(evaluateMetricStatus(1.0, { normalMin: 0.8, normalMax: 1.4 }), { tone: 'good', label: '🟢 正常' });
  assert.deepEqual(evaluateMetricStatus(30, { normalMin: 0, normalMax: 10 }), { tone: 'alert', label: '🔴 要注意' });
  assert.deepEqual(evaluateDifferenceStatus(3, 10), { tone: 'good', label: '🟢 良好' });
  assert.deepEqual(evaluateDifferenceStatus(15, 10), { tone: 'warn', label: '🟡 やや差あり' });
});

test('createReportSummary builds a frontal summary with session-based date', () => {
  const summary = createReportSummary({
    analysisData: sampleData,
    analysisPlane: 'frontal',
    currentPlane: 'sagittal',
    patientId: 'PT-0001',
    stepCount: 6,
    sessionTimestamp: Date.UTC(2026, 0, 2),
    captureMode: 'video',
    totalProcessedFrames: 5,
    gaitEvents: [{ type: 'heel-strike', timestamp: 1000 }],
    appVersion: 'test-report-version'
  });

  assert.equal(summary.reportPlane, 'frontal');
  assert.equal(summary.patientId, 'PT-0001');
  assert.equal(summary.sessionId, 'session-PT-0001-1767312000000');
  assert.equal(summary.appVersion, 'test-report-version');
  assert.equal(summary.stepCount, 6);
  assert.equal(summary.durationMs, 2000);
  assert.equal(summary.dataPoints, 3);
  assert.equal(summary.avgSpeed, 1.1);
  assert.equal(summary.avgCadence, 114);
  assert.equal(summary.captureMode, 'video');
  assert.equal(summary.validFrames, 3);
  assert.equal(summary.totalProcessedFrames, 5);
  assert.equal(summary.validFrameRatio, 0.6);
  assert.equal(summary.missingLandmarkRatio, 0.4);
  assert.equal(summary.gaitEventDetected, true);
  assert.equal(summary.speedPolicyLabel, 'estimated');
  assert.equal(summary.metricAvailability.speed, true);
  assert.equal(summary.metricAvailability.leftKnee, true);
  assert.ok(summary.qualitySummary.includes('capture=video'));
  assert.ok(summary.sessionDateLabel.includes('2026'));
  assert.ok(summary.comments.some((comment) => comment.includes('[frontal.overall.good]')));
  assert.ok(summary.comments.every((comment) => comment.startsWith('[')));
});

test('createReportSummary falls back to currentPlane and keeps sagittal diffs', () => {
  const summary = createReportSummary({
    analysisData: sampleData,
    analysisPlane: '',
    currentPlane: 'sagittal',
    patientId: 'PT-0002',
    stepCount: 4,
    sessionTimestamp: Date.UTC(2025, 11, 31),
    captureMode: 'camera',
    totalProcessedFrames: 3
  });

  assert.equal(summary.reportPlane, 'sagittal');
  assert.ok(summary.kneeDiff >= 0);
  assert.ok(summary.hipDiff >= 0);
  assert.ok(summary.ankleDiff >= 0);
  assert.ok(summary.comments.length >= 1);
  assert.ok(summary.comments.every((comment) => comment.startsWith('[')));
});

test('createReportSummary emits traceable rule ids for threshold-triggered comments', () => {
  const summary = createReportSummary({
    analysisData: [
      { elapsedMs: 0, speed: 0.5, cadence: 90, symmetry: 80, trunk: 18, pelvis: 0, leftKnee: 0, rightKnee: 0, leftHip: 0, rightHip: 0, leftAnkle: 0, rightAnkle: 0 }
    ],
    analysisPlane: 'frontal',
    currentPlane: 'frontal',
    patientId: 'PT-0003',
    stepCount: 2,
    sessionTimestamp: Date.UTC(2026, 2, 23)
  });

  assert.ok(summary.comments.some((comment) => comment.includes('[frontal.speed.slow]')));
  assert.ok(summary.comments.some((comment) => comment.includes('[frontal.symmetry.low]')));
  assert.ok(summary.comments.some((comment) => comment.includes('[frontal.trunk.elevated]')));
  assert.ok(summary.comments.some((comment) => comment.includes('[frontal.cadence.low]')));
});

test('createReportSummary marks zero-only placeholder metrics as not computed', () => {
  const summary = createReportSummary({
    analysisData: [{ elapsedMs: 0, speed: 0, cadence: 0, symmetry: 0, trunk: 0, pelvis: 0, leftKnee: 0, rightKnee: 0, leftHip: 0, rightHip: 0, leftAnkle: 0, rightAnkle: 0 }],
    analysisPlane: 'sagittal',
    currentPlane: 'sagittal',
    patientId: 'PT-0004',
    stepCount: 0,
    sessionTimestamp: Date.UTC(2026, 2, 23)
  });

  assert.equal(summary.metricAvailability.speed, false);
  assert.equal(summary.metricAvailability.leftKnee, false);
  assert.equal(summary.metricAvailability.rightKnee, false);
  assert.equal(summary.metricAvailability.pelvis, true);
});
