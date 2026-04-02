import test from 'node:test';
import assert from 'node:assert/strict';

import { LM } from '../src/analysis/constants.js';
import {
  calcAngle3D,
  calcJointAngles,
  calcPelvicTilt,
  calcStepSymmetry,
  calcSymmetryIndex,
  calcTrunkAngle,
  calcWalkingSpeed,
  detectGaitEvent,
  ema
} from '../src/analysis/metrics.js';

function createLandmarks() {
  return Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }));
}

test('calcAngle3D returns 90 degrees for a right angle', () => {
  const angle = calcAngle3D({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 });
  assert.ok(Math.abs(angle - 90) < 1e-6);
});

test('calcJointAngles returns null when landmarks are incomplete', () => {
  assert.equal(calcJointAngles([]), null);
});

test('calcJointAngles reads world-landmark geometry from shared indices', () => {
  const wl = createLandmarks();
  wl[LM.LEFT_SHOULDER] = { x: 0, y: 1, z: 0 };
  wl[LM.LEFT_HIP] = { x: 0, y: 0, z: 0 };
  wl[LM.LEFT_KNEE] = { x: 1, y: 0, z: 0 };
  wl[LM.RIGHT_SHOULDER] = { x: 0, y: 1, z: 0 };
  wl[LM.RIGHT_HIP] = { x: 0, y: 0, z: 0 };
  wl[LM.RIGHT_KNEE] = { x: 1, y: 0, z: 0 };
  wl[LM.LEFT_ANKLE] = { x: 2, y: 0, z: 0 };
  wl[LM.RIGHT_ANKLE] = { x: 2, y: 0, z: 0 };
  wl[LM.LEFT_FOOT_INDEX] = { x: 3, y: 0, z: 0 };
  wl[LM.RIGHT_FOOT_INDEX] = { x: 3, y: 0, z: 0 };

  const angles = calcJointAngles(wl);
  assert.ok(angles);
  assert.ok(Math.abs(angles.leftHip - 90) < 1e-6);
  assert.ok(Math.abs(angles.rightHip - 90) < 1e-6);
  assert.ok(Math.abs(angles.leftKnee - 180) < 1e-6);
});

test('calcTrunkAngle returns 0 for upright posture', () => {
  const wl = createLandmarks();
  wl[LM.LEFT_SHOULDER] = { x: -0.1, y: -1, z: 0 };
  wl[LM.RIGHT_SHOULDER] = { x: 0.1, y: -1, z: 0 };
  wl[LM.LEFT_HIP] = { x: -0.1, y: 0, z: 0 };
  wl[LM.RIGHT_HIP] = { x: 0.1, y: 0, z: 0 };

  assert.equal(calcTrunkAngle(wl, { log() {}, warn() {} }), 0);
});

test('calcPelvicTilt detects left-right vertical offset', () => {
  const wl = createLandmarks();
  wl[LM.LEFT_HIP] = { x: 0, y: 0, z: 0 };
  wl[LM.RIGHT_HIP] = { x: 1, y: 1, z: 0 };
  const tilt = calcPelvicTilt(wl);
  assert.ok(tilt > 40 && tilt < 50);
});

test('calcWalkingSpeed scales displacement by shoulder width', () => {
  const prev = createLandmarks();
  const curr = createLandmarks();

  prev[LM.LEFT_HIP] = { x: 0, y: 0, z: 0 };
  prev[LM.RIGHT_HIP] = { x: 0.2, y: 0, z: 0 };
  curr[LM.LEFT_HIP] = { x: 0.1, y: 0, z: 0 };
  curr[LM.RIGHT_HIP] = { x: 0.3, y: 0, z: 0 };

  prev[LM.LEFT_SHOULDER] = { x: 0, y: 1, z: 0 };
  prev[LM.RIGHT_SHOULDER] = { x: 1, y: 1, z: 0 };
  curr[LM.LEFT_SHOULDER] = { x: 0, y: 1, z: 0 };
  curr[LM.RIGHT_SHOULDER] = { x: 1, y: 1, z: 0 };

  const speed = calcWalkingSpeed(curr, prev, 1000, { log() {}, warn() {} });
  assert.ok(Math.abs(speed - 0.04) < 1e-6);
});

test('calcWalkingSpeed falls back to hip width when shoulders are too close', () => {
  const prev = createLandmarks();
  const curr = createLandmarks();

  prev[LM.LEFT_HIP] = { x: 0, y: 0, z: 0 };
  prev[LM.RIGHT_HIP] = { x: 0.2, y: 0, z: 0 };
  curr[LM.LEFT_HIP] = { x: 0.1, y: 0, z: 0 };
  curr[LM.RIGHT_HIP] = { x: 0.3, y: 0, z: 0 };

  curr[LM.LEFT_SHOULDER] = { x: 0, y: 1, z: 0 };
  curr[LM.RIGHT_SHOULDER] = { x: 0.005, y: 1, z: 0 };

  const speed = calcWalkingSpeed(curr, prev, 1000, { log() {}, warn() {} });
  assert.ok(speed > 0);
});

test('calcWalkingSpeed ignores overly-short frame intervals', () => {
  const prev = createLandmarks();
  const curr = createLandmarks();
  prev[LM.LEFT_HIP] = { x: 0, y: 0, z: 0 };
  prev[LM.RIGHT_HIP] = { x: 0.2, y: 0, z: 0 };
  curr[LM.LEFT_HIP] = { x: 0.1, y: 0, z: 0 };
  curr[LM.RIGHT_HIP] = { x: 0.3, y: 0, z: 0 };
  curr[LM.LEFT_SHOULDER] = { x: 0, y: 1, z: 0 };
  curr[LM.RIGHT_SHOULDER] = { x: 1, y: 1, z: 0 };

  const speed = calcWalkingSpeed(curr, prev, 5, { log() {}, warn() {} });
  assert.equal(speed, 0);
});

test('calcWalkingSpeed falls back to ankle motion when hip displacement is near zero', () => {
  const prev = createLandmarks();
  const curr = createLandmarks();

  prev[LM.LEFT_HIP] = { x: 0.1, y: 0, z: 0 };
  prev[LM.RIGHT_HIP] = { x: 0.3, y: 0, z: 0 };
  curr[LM.LEFT_HIP] = { x: 0.1, y: 0, z: 0 };
  curr[LM.RIGHT_HIP] = { x: 0.3, y: 0, z: 0 };

  prev[LM.LEFT_ANKLE] = { x: 0, y: 0, z: 0 };
  prev[LM.RIGHT_ANKLE] = { x: 0.2, y: 0, z: 0 };
  curr[LM.LEFT_ANKLE] = { x: 0.05, y: 0, z: 0 };
  curr[LM.RIGHT_ANKLE] = { x: 0.25, y: 0, z: 0 };

  curr[LM.LEFT_SHOULDER] = { x: 0, y: 1, z: 0 };
  curr[LM.RIGHT_SHOULDER] = { x: 1, y: 1, z: 0 };

  const speed = calcWalkingSpeed(curr, prev, 1000, { log() {}, warn() {} });
  assert.ok(speed > 0);
});

test('calcSymmetryIndex returns 100 for identical values and clamps low values', () => {
  assert.equal(calcSymmetryIndex(30, 30), 100);
  assert.equal(calcSymmetryIndex(0, 100), 0);
});

test('detectGaitEvent emits a left heel strike when threshold conditions are met', () => {
  const prev = createLandmarks();
  const curr = createLandmarks();

  prev[LM.LEFT_HEEL] = { x: 0, y: 0.40, z: 0 };
  curr[LM.LEFT_HEEL] = { x: 0, y: 0.70, z: 0 };
  curr[LM.LEFT_FOOT_INDEX] = { x: 0, y: 0.72, z: 0 };
  curr[LM.LEFT_KNEE] = { x: 0, y: 0.50, z: 0 };

  prev[LM.RIGHT_HEEL] = { x: 0, y: 0.40, z: 0 };
  curr[LM.RIGHT_HEEL] = { x: 0, y: 0.40, z: 0 };
  curr[LM.RIGHT_FOOT_INDEX] = { x: 0, y: 0.41, z: 0 };
  curr[LM.RIGHT_KNEE] = { x: 0, y: 0.50, z: 0 };

  const result = detectGaitEvent({
    landmarks: curr,
    prevLandmarks: prev,
    timestamp: 1000,
    lastHeelStrikeTime: 0,
    logger: { log() {}, warn() {} }
  });

  assert.deepEqual(result.event, { type: 'left_heel_strike', timestamp: 1000 });
  assert.equal(result.stepIncrement, 1);
  assert.equal(result.nextLastHeelStrikeTime, 1000);
});

test('ema returns a weighted moving average', () => {
  assert.equal(ema(10, 20, 0.2), 12);
});

test('calcStepSymmetry returns 100 when fewer than 4 events', () => {
  assert.equal(calcStepSymmetry([]), 100);
  assert.equal(calcStepSymmetry([{ timestamp: 0 }, { timestamp: 500 }]), 100);
});

test('calcStepSymmetry returns high symmetry for perfectly even intervals', () => {
  // 4 events with equal 500ms intervals → perfectly symmetric
  const events = [
    { timestamp: 0 },
    { timestamp: 500 },
    { timestamp: 1000 },
    { timestamp: 1500 },
    { timestamp: 2000 }
  ];
  const result = calcStepSymmetry(events);
  assert.ok(result >= 99, `Expected >= 99, got ${result}`);
});

test('calcStepSymmetry returns low symmetry for very uneven intervals', () => {
  // alternating 200ms / 800ms intervals → asymmetric
  const events = [
    { timestamp: 0 },
    { timestamp: 200 },
    { timestamp: 1000 },
    { timestamp: 1200 },
    { timestamp: 2000 },
    { timestamp: 2200 }
  ];
  const result = calcStepSymmetry(events);
  assert.ok(result < 70, `Expected < 70 for uneven steps, got ${result}`);
});
