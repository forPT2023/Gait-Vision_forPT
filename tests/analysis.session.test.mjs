import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAnalysisDataPoint, calculateCadenceFromEvents } from '../src/analysis/session.js';

test('calculateCadenceFromEvents uses recent gait events and clamps invalid ranges', () => {
  assert.equal(
    calculateCadenceFromEvents({
      gaitEvents: [{ timestamp: 1000 }, { timestamp: 6000 }],
      mpTimestamp: 7000
    }),
    0
  );

  assert.equal(
    calculateCadenceFromEvents({
      gaitEvents: [{ timestamp: 1000 }, { timestamp: 3500 }, { timestamp: 6000 }],
      mpTimestamp: 7000,
      timeWindowMs: 10000,
      minCadence: 0
    }),
    18
  );
});

test('buildAnalysisDataPoint clamps metrics and preserves frame metadata', () => {
  const point = buildAnalysisDataPoint({
    elapsedMs: 1000,
    analysisStartEpochMs: 5000,
    mpTimestamp: 9000,
    landmarks: [{ x: 1 }],
    worldLandmarks: [{ x: 2 }],
    angles: { leftKnee: 10 },
    emaValues: { speed: Infinity, cadence: 999, trunk: -1, pelvis: 40, leftKnee: 200, rightKnee: 30, leftHip: 20, rightHip: 10, leftAnkle: 190, rightAnkle: NaN },
    kneeSymmetry: 120
  });

  assert.equal(point.recordedAt, 6000);
  assert.equal(point.speed, 0);
  assert.equal(point.cadence, 200);
  assert.equal(point.symmetry, 100);
  assert.equal(point.trunk, 0);
  assert.equal(point.pelvis, 30);
  assert.equal(point.leftKnee, 180);
  assert.equal(point.rightKnee, 30);
  assert.equal(point.leftAnkle, 180);
  assert.equal(point.rightAnkle, 0);
});
