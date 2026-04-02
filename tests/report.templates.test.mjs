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
  leftAnkle: { normalMin: 60, normalMax: 120 },
  rightAnkle: { normalMin: 60, normalMax: 120 },
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
    avgLeftAnkle: 90,
    avgRightAnkle: 92,
    avgPelvis: 6,
    avgSpeed: 1.1,
    avgCadence: 114,
    kneeDiff: 2,
    metricAvailability: { leftKnee: true, rightKnee: true, leftAnkle: true, rightAnkle: true, pelvis: true, speed: true, cadence: true },
    thresholds: sharedThresholds
  });

  assert.ok(html.includes('膝関節角度（左）'));
  assert.ok(html.includes('膝関節角度（右）'));
  assert.ok(html.includes('膝角度左右差'));
  // 矢状面の主要指標カードには足首・骨盤・速度・ケイデンスは含まれない
  assert.ok(!html.includes('左足首'));
  assert.ok(!html.includes('骨盤傾斜'));
  assert.ok(!html.includes('歩行速度'));
  assert.ok(!html.includes('ケイデンス'));
});

test('renderSagittalPrimaryMetrics renders 未計算 when knee/ankle metrics are unavailable', () => {
  const html = renderSagittalPrimaryMetrics({
    avgLeftKnee: 0,
    avgRightKnee: 0,
    avgLeftAnkle: 0,
    avgRightAnkle: 0,
    avgPelvis: 6,
    avgSpeed: 0,
    avgCadence: 0,
    kneeDiff: 0,
    metricAvailability: { leftKnee: false, rightKnee: false, leftAnkle: false, rightAnkle: false, pelvis: true, speed: false, cadence: false },
    thresholds: sharedThresholds
  });

  assert.ok(html.includes('未計算'));
});
