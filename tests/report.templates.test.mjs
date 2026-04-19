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
  kneeSwingPeak: { normalMin: 55, normalMax: 70, lowBelow: 50 },
  kneeStanceExt: { normalMin: 5, normalMax: 15, elevatedAbove: 20 },
  kneeSwingPeakDiff: { threshold: 10, elevatedAbove: 15 },
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
  assert.ok(html.includes('体幹側方傾斜'));
});

test('renderSagittalPrimaryMetrics renders sagittal metric labels (no peaks)', () => {
  // kneePeaks=null または ストライド数 < 2 の場合はピークセクションなし
  const html = renderSagittalPrimaryMetrics({
    avgLeftKnee: 40,
    avgRightKnee: 42,
    avgLeftAnkle: 90,
    avgRightAnkle: 92,
    avgPelvis: 6,
    avgSpeed: 1.1,
    avgCadence: 114,
    kneeDiff: 2,
    kneePeaks: null,  // ピーク未計測
    metricAvailability: { leftKnee: true, rightKnee: true, leftAnkle: true, rightAnkle: true, pelvis: true, speed: true, cadence: true },
    thresholds: sharedThresholds
  });

  // 平均値セクションは常に表示
  assert.ok(html.includes('平均角度（左）'));
  assert.ok(html.includes('平均角度（右）'));
  assert.ok(html.includes('平均左右差'));
  // ピークセクション（ヘッダ付き）は非表示
  assert.ok(!html.includes('遊脚期最大屈曲（左）'));
  // 足首は含まれない（骨盤傾斜・速度・ケイデンスは表示される）
  assert.ok(!html.includes('左足首'));
  // 骨盤傾斜・速度・ケイデンスは追加表示される
  assert.ok(html.includes('骨盤傾斜'));
  assert.ok(html.includes('歩行速度'));
  assert.ok(html.includes('ケイデンス'));
});

test('renderSagittalPrimaryMetrics renders peak section when kneePeaks has enough strides', () => {
  const html = renderSagittalPrimaryMetrics({
    avgLeftKnee: 40,
    avgRightKnee: 42,
    avgPelvis: 6,
    avgSpeed: 1.1,
    avgCadence: 114,
    kneeDiff: 2,
    kneePeaks: {
      leftStrideCount: 3,
      rightStrideCount: 3,
      leftSwingPeakMedian: 62.5,
      rightSwingPeakMedian: 60.0,
      leftStanceMinMedian: 10.2,
      rightStanceMinMedian: 11.5,
      leftSwingPeakMax: 65,
      rightSwingPeakMax: 63,
      leftStanceMinExt: 8,
      rightStanceMinExt: 9
    },
    metricAvailability: { leftKnee: true, rightKnee: true, pelvis: true, speed: true, cadence: true },
    thresholds: sharedThresholds
  });

  // ピークセクションが表示される
  assert.ok(html.includes('遊脚期最大屈曲（左）'));
  assert.ok(html.includes('遊脚期最大屈曲（右）'));
  assert.ok(html.includes('遊脚ピーク左右差'));
  assert.ok(html.includes('立脚伸展最小（左）'));
  assert.ok(html.includes('立脚伸展最小（右）'));
  // ストライド数も表示される
  assert.ok(html.includes('3歩'));
  // 平均値セクションも引き続き表示
  assert.ok(html.includes('平均角度（左）'));
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
