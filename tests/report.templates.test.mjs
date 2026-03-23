import test from 'node:test';
import assert from 'node:assert/strict';

import { renderFrontalPrimaryMetrics } from '../src/report/templates/frontal.js';
import { renderSagittalPrimaryMetrics } from '../src/report/templates/sagittal.js';

const sharedThresholds = {
  speed: { normalMin: 0.8, normalMax: 1.4 },
  cadence: { normalMin: 100, normalMax: 130 },
  symmetry: { normalMin: 90, normalMax: 100 },
  trunk: { normalMin: 0, normalMax: 10 },
  leftKnee: { normalMin: 0, normalMax: 80 },
  rightKnee: { normalMin: 0, normalMax: 80 },
  pelvis: { normalMin: 0, normalMax: 10 },
  kneeDiff: { threshold: 10 }
};

test('renderFrontalPrimaryMetrics renders frontal metric labels', () => {
  const html = renderFrontalPrimaryMetrics({
    avgSpeed: 1.1,
    avgCadence: 114,
    avgSymmetry: 95,
    avgTrunk: 9,
    metricAvailability: { speed: true, cadence: true, symmetry: true, trunk: true },
    thresholds: sharedThresholds
  });

  assert.ok(html.includes('歩行速度'));
  assert.ok(html.includes('ケイデンス'));
  assert.ok(html.includes('対称性'));
  assert.ok(html.includes('体幹傾斜'));
});

test('renderSagittalPrimaryMetrics renders sagittal metric labels', () => {
  const html = renderSagittalPrimaryMetrics({
    avgLeftKnee: 40,
    avgRightKnee: 42,
    avgPelvis: 6,
    kneeDiff: 2,
    metricAvailability: { leftKnee: true, rightKnee: true, pelvis: true },
    thresholds: sharedThresholds
  });

  assert.ok(html.includes('左膝'));
  assert.ok(html.includes('右膝'));
  assert.ok(html.includes('骨盤傾斜'));
  assert.ok(html.includes('左右膝差'));
});

test('renderSagittalPrimaryMetrics renders 未計算 when knee metrics are unavailable', () => {
  const html = renderSagittalPrimaryMetrics({
    avgLeftKnee: 0,
    avgRightKnee: 0,
    avgPelvis: 6,
    kneeDiff: 0,
    metricAvailability: { leftKnee: false, rightKnee: false, pelvis: true },
    thresholds: sharedThresholds
  });

  assert.ok(html.includes('未計算'));
});
