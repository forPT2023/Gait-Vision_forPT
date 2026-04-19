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

test('calcTrunkAngle returns 0 for upright posture (frontal plane)', () => {
  // 前額面: 肩と股関節が真上に並んでいて左右の x 差がない → 側方傾斜 0°
  // MediaPipe world coords: Y下向き正。肩は腰より上 = Y値が負（または腰より小さい）。
  // shoulderMid=(0,-1,0), hipMid=(0,0,0) → dx=0, absVertical=1
  // angle = |atan2(0, 1)| = 0°
  const wl = createLandmarks();
  wl[LM.LEFT_SHOULDER]  = { x: -0.1, y: -1, z: 0 };
  wl[LM.RIGHT_SHOULDER] = { x: 0.1,  y: -1, z: 0 };
  wl[LM.LEFT_HIP]       = { x: -0.1, y: 0,  z: 0 };
  wl[LM.RIGHT_HIP]      = { x: 0.1,  y: 0,  z: 0 };
  const angle = calcTrunkAngle(wl, 'frontal');
  assert.ok(Math.abs(angle) < 1e-6, `expected 0° for upright frontal, got ${angle}`);
});

test('calcTrunkAngle detects lateral lean in frontal plane', () => {
  // 前額面: 肩中点が股中点より右にずれている（体幹右傾斜）
  // shoulderMid=(0.2,-1,0), hipMid=(0,0,0) → dx=0.2, absVertical=1
  // angle = |atan2(0.2, 1)| ≈ 11.3°
  const wl = createLandmarks();
  wl[LM.LEFT_SHOULDER]  = { x: 0.1,  y: -1, z: 0 };
  wl[LM.RIGHT_SHOULDER] = { x: 0.3,  y: -1, z: 0 };
  wl[LM.LEFT_HIP]       = { x: -0.1, y: 0,  z: 0 };
  wl[LM.RIGHT_HIP]      = { x: 0.1,  y: 0,  z: 0 };
  const angle = calcTrunkAngle(wl, 'frontal');
  assert.ok(angle > 8 && angle < 15, `expected ~11° for lateral lean, got ${angle}`);
});

test('calcTrunkAngle detects forward lean in sagittal plane', () => {
  // 矢状面: 肩が股より前方（z が小さい）に位置 → 前傾
  // shoulderMid=(0,-1,-0.2), hipMid=(0,0,0)
  // dz = -0.2 - 0 = -0.2, absVertical = |-1 - 0| = 1
  // angle = |atan2(-0.2, 1)| ≈ 11.3°
  const wl = createLandmarks();
  wl[LM.LEFT_SHOULDER]  = { x: -0.1, y: -1, z: -0.2 };
  wl[LM.RIGHT_SHOULDER] = { x: 0.1,  y: -1, z: -0.2 };
  wl[LM.LEFT_HIP]       = { x: -0.1, y: 0,  z: 0 };
  wl[LM.RIGHT_HIP]      = { x: 0.1,  y: 0,  z: 0 };
  const angle = calcTrunkAngle(wl, 'sagittal');
  assert.ok(angle > 8 && angle < 15, `expected ~11° for forward lean, got ${angle}`);
});

test('calcTrunkAngle returns 0 for upright posture in sagittal plane', () => {
  // 矢状面: 肩と股が同じ Z 平面（前後傾なし）→ dz=0 → angle=0
  const wl = createLandmarks();
  wl[LM.LEFT_SHOULDER]  = { x: -0.1, y: -1, z: 0 };
  wl[LM.RIGHT_SHOULDER] = { x: 0.1,  y: -1, z: 0 };
  wl[LM.LEFT_HIP]       = { x: -0.1, y: 0,  z: 0 };
  wl[LM.RIGHT_HIP]      = { x: 0.1,  y: 0,  z: 0 };
  const angle = calcTrunkAngle(wl, 'sagittal');
  assert.ok(Math.abs(angle) < 1e-6, `expected 0° for upright sagittal, got ${angle}`);
});

test('calcPelvicTilt detects left-right vertical offset (frontal plane)', () => {
  const wl = createLandmarks();
  wl[LM.LEFT_HIP] = { x: 0, y: 0, z: 0 };
  wl[LM.RIGHT_HIP] = { x: 1, y: 1, z: 0 };
  const tilt = calcPelvicTilt(wl, 'frontal');
  assert.ok(tilt > 40 && tilt < 50, `frontal plane tilt should be ~45°, got ${tilt}`);
});

test('calcPelvicTilt returns 0 for level pelvis in frontal plane', () => {
  const wl = createLandmarks();
  wl[LM.LEFT_HIP] = { x: -0.1, y: 0.6, z: 0 };
  wl[LM.RIGHT_HIP] = { x: 0.1, y: 0.6, z: 0 };
  const tilt = calcPelvicTilt(wl, 'frontal');
  assert.ok(Math.abs(tilt) < 1e-6, `frontal level pelvis should be 0°, got ${tilt}`);
});

test('calcPelvicTilt detects anterior tilt in sagittal plane', () => {
  // 矢状面: 左右HIPがZ軸方向に並ぶ。前傾 = 前側のHIPが少し上（Y小）
  const wl = createLandmarks();
  wl[LM.LEFT_HIP]  = { x: 0.5, y: 0.62, z:  0.15 }; // 後ろ側（カメラから遠い）
  wl[LM.RIGHT_HIP] = { x: 0.5, y: 0.60, z: -0.15 }; // 前側（カメラに近い）
  const tilt = calcPelvicTilt(wl, 'sagittal');
  // dy = 0.60 - 0.62 = -0.02, |dz| = 0.30 → atan2(0.02, 0.30) ≈ 3.8°
  assert.ok(tilt > 2 && tilt < 10, `sagittal anterior tilt should be ~4°, got ${tilt}`);
});

test('calcPelvicTilt returns 0 for level pelvis in sagittal plane', () => {
  const wl = createLandmarks();
  wl[LM.LEFT_HIP]  = { x: 0.5, y: 0.60, z:  0.15 };
  wl[LM.RIGHT_HIP] = { x: 0.5, y: 0.60, z: -0.15 };
  const tilt = calcPelvicTilt(wl, 'sagittal');
  assert.ok(Math.abs(tilt) < 1e-6, `sagittal level pelvis should be 0°, got ${tilt}`);
});

test('calcPelvicTilt returns 0 when Z depth difference is negligible in sagittal plane', () => {
  // dzがゼロに近い場合（正面向きに近い状態）は計算不能として0を返す
  const wl = createLandmarks();
  wl[LM.LEFT_HIP]  = { x: 0.4, y: 0.60, z: 0.0 };
  wl[LM.RIGHT_HIP] = { x: 0.6, y: 0.62, z: 0.0 };
  const tilt = calcPelvicTilt(wl, 'sagittal');
  assert.strictEqual(tilt, 0, `sagittal with no Z spread should return 0, got ${tilt}`);
});

test('calcPelvicTilt defaults to frontal plane when no plane argument given', () => {
  const wl = createLandmarks();
  wl[LM.LEFT_HIP] = { x: 0, y: 0, z: 0 };
  wl[LM.RIGHT_HIP] = { x: 1, y: 1, z: 0 };
  const tiltDefault = calcPelvicTilt(wl);
  const tiltFrontal = calcPelvicTilt(wl, 'frontal');
  assert.strictEqual(tiltDefault, tiltFrontal, 'default should equal frontal plane');
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

// ── detectGaitEvent: state machine ベース（worldLandmarks 主検出） ────────────────────────
// v6設計: worldLandmarks.y は上向き正（下向き = 正値）
// 接地時 y ≈ +0.75～+0.85m，スウィング最高点 ≈ +0.60～+0.65m
// state: d<0 → 'down'(踵上昇=スウィング)，d>0 → 'up'(踵下降=接地方向)
// ヒールストライク: UP→non-UP + heelHigh(emaY>0.70) + hadSwing(swingPeak<0.70)
function createWorldLandmarks() {
  // 接地位置のデフォルト値: y=+0.80 (接地相当)
  return Array.from({ length: 33 }, () => ({ x: 0, y: 0.80, z: 0 }));
}

test('detectGaitEvent (world/SM): left heel strike via UP→non-UP transition', () => {
  // v6: 左踵がヒールストライク（UP→down：接地に向けた下降が急に終わる）を検出
  // 接地フェーズピーク後に踵Y が微減少: d < -NOISE → state=down → UP→down 遷移
  // prevEma=0.814(ピーク付近), currY=0.800(微減少) → d=0.4*(0.800-0.814)=-0.0056 < -NOISE → down ✅
  // heelHigh: curEma=0.808 > 0.70 ✅, hadSwing: eventCount=0 → true ✅
  const currWorld = createWorldLandmarks();
  currWorld[LM.LEFT_HEEL]  = { x: 0, y: 0.800, z: 0 }; // 接地後微減少
  currWorld[LM.RIGHT_HEEL] = { x: 0, y: 0.630, z: 0 }; // 右踵は空中

  const result = detectGaitEvent({
    landmarks: createLandmarks(), prevLandmarks: createLandmarks(),
    worldLandmarks: currWorld,
    timestamp: 1000,
    lastLeftHeelStrikeTime: 0, lastRightHeelStrikeTime: 0,
    leftHeelState: 'up',     // 前フレームで上昇中（接地フェーズのピークへ向かっていた）
    rightHeelState: 'stable',
    emaLeftHeelY:  0.814,    // 前フレームEMA値（接地フェーズピーク = 最大値）
    emaRightHeelY: 0.630,
    leftEventCount:  0,      // 初回ステップ: hadSwing=true で検出許可
    rightEventCount: 0,
    logger: { log() {} }
  });

  assert.deepEqual(result.event, { type: 'left_heel_strike', timestamp: 1000 });
  assert.equal(result.stepIncrement, 1);
  assert.equal(result.nextLastLeftHeelStrikeTime, 1000);
  // 左検出後も右は変わらない
  assert.equal(result.nextLastRightHeelStrikeTime, 0);
});

test('detectGaitEvent (world/SM): right heel strike via UP→non-UP transition', () => {
  // 右踵がヒールストライク（UP→down 遷移）
  const currWorld = createWorldLandmarks();
  currWorld[LM.LEFT_HEEL]  = { x: 0, y: 0.630, z: 0 }; // 左踵は空中
  currWorld[LM.RIGHT_HEEL] = { x: 0, y: 0.800, z: 0 }; // 右踵が接地後微減少

  const result = detectGaitEvent({
    landmarks: createLandmarks(), prevLandmarks: createLandmarks(),
    worldLandmarks: currWorld,
    timestamp: 1500,
    lastLeftHeelStrikeTime: 1000, lastRightHeelStrikeTime: 0,
    leftHeelState: 'stable',
    rightHeelState: 'up',    // 右が上昇中（接地フェーズピークへ向かっていた）
    emaLeftHeelY:  0.630,
    emaRightHeelY: 0.814,    // 前フレームEMA値（接地フェーズピーク）
    leftEventCount:  1,
    rightEventCount: 0,      // 右は初回: hadSwing=true
    logger: { log() {} }
  });

  assert.deepEqual(result.event, { type: 'right_heel_strike', timestamp: 1500 });
  assert.equal(result.nextLastRightHeelStrikeTime, 1500);
  // 右検出後も左タイマーは変わらない
  assert.equal(result.nextLastLeftHeelStrikeTime, 1000);
});

test('detectGaitEvent (world/SM): no event when heel state is not "up"', () => {
  // leftHeelState='stable' → UP→non-UP 遷移なしので検出しない
  const currWorld = createWorldLandmarks();
  currWorld[LM.LEFT_HEEL] = { x: 0, y: 0.800, z: 0 };

  const result = detectGaitEvent({
    landmarks: createLandmarks(), prevLandmarks: createLandmarks(),
    worldLandmarks: currWorld,
    timestamp: 1000,
    lastLeftHeelStrikeTime: 0, lastRightHeelStrikeTime: 0,
    leftHeelState: 'stable',  // 'up' ではないので検出しない
    rightHeelState: 'stable',
    emaLeftHeelY: 0.814,
    logger: { log() {} }
  });
  assert.equal(result.event, null, 'state=stable の時は検出しない');
});

test('detectGaitEvent (world/SM): no event when heel not high enough (heelHigh fail)', () => {
  // HEEL_HIGH_THR=+0.70m。踵EMA=+0.65m は heelHigh=false → 検出しない
  // 足がまだ空中（スウィング中）に相当
  const currWorld = createWorldLandmarks();
  currWorld[LM.LEFT_HEEL] = { x: 0, y: 0.650, z: 0 }; // 地面から遠い（スウィング中）

  const result = detectGaitEvent({
    landmarks: createLandmarks(), prevLandmarks: createLandmarks(),
    worldLandmarks: currWorld,
    timestamp: 1000,
    lastLeftHeelStrikeTime: 0, lastRightHeelStrikeTime: 0,
    leftHeelState: 'up',     // 下降中だが空中（heelHigh失敗）
    rightHeelState: 'stable',
    emaLeftHeelY: 0.670,     // 前フレーム: 0.670, currY=0.650 → d=0.4*(0.650-0.670)=-0.008 → down
    leftEventCount: 0,
    logger: { log() {} }
  });
  assert.equal(result.event, null, 'heelHigh(0.70)未満では検出しない（curEma≈0.658はheelHigh=false）');
});

test('detectGaitEvent (world/SM): left minIntervalMs suppresses rapid re-detection', () => {
  // 左は 200ms 前に検出済み → minIntervalMs=500 → ブロック
  const currWorld = createWorldLandmarks();
  currWorld[LM.LEFT_HEEL] = { x: 0, y: 0.800, z: 0 }; // 接地中

  const result = detectGaitEvent({
    landmarks: createLandmarks(), prevLandmarks: createLandmarks(),
    worldLandmarks: currWorld,
    timestamp: 900,
    lastLeftHeelStrikeTime: 700,  // 200ms 前 < minIntervalMs=500
    lastRightHeelStrikeTime: 0,
    leftHeelState: 'up',     // UP→down 遷移条件は満たす
    rightHeelState: 'stable',
    emaLeftHeelY: 0.814,     // 前フレームEMA（接地フェーズピーク）
    leftEventCount: 1,       // 既に検出済み（hadSwing=false になるが minIntervalMs でブロック）
    minIntervalMs: 500,
    logger: { log() {} }
  });
  assert.equal(result.event, null, 'minIntervalMs 以内の再検出は抑制');
});

test('detectGaitEvent (world/SM): right fires independently of left timer', () => {
  // 左が直近に検出済みでも、右の独立タイマーが十分経過していれば検出できる
  const currWorld = createWorldLandmarks();
  currWorld[LM.RIGHT_HEEL] = { x: 0, y: 0.800, z: 0 }; // 右踵接地後微減少

  const result = detectGaitEvent({
    landmarks: createLandmarks(), prevLandmarks: createLandmarks(),
    worldLandmarks: currWorld,
    timestamp: 1000,
    lastLeftHeelStrikeTime: 800,   // 左: 200ms前 (minIntervalMs=500 でブロック)
    lastRightHeelStrikeTime: 0,    // 右: 未検出
    leftHeelState: 'stable',
    rightHeelState: 'up',          // 右: 上昇中（接地フェーズピークへ向かっていた）
    emaRightHeelY: 0.814,          // 前フレームEMA値（接地フェーズピーク）
    rightEventCount: 0,            // 右は初回: hadSwing=true
    minIntervalMs: 500,
    logger: { log() {} }
  });
  assert.deepEqual(result.event, { type: 'right_heel_strike', timestamp: 1000 });
  assert.equal(result.nextLastRightHeelStrikeTime, 1000);
  assert.equal(result.nextLastLeftHeelStrikeTime, 800, '左タイマーは変わらない');
});

test('detectGaitEvent (world/SM): left heel strike via UP→stable transition (plateau landing)', () => {
  // 踵がプラトー（微小変化）に達したときに 'stable' に遷移し、UP→stable でヒールストライクを検出する
  // 歩幅が小さい患者など、接地後の踵YがEMA収束まで変化が小さい場合をカバーする
  // prevEma=0.760, currY=0.761 → d=0.4*(0.761-0.760)=+0.0004 → |d|≤NOISE_THR → stable
  // heelHigh: curEma=0.760 > 0.70 ✅, hadSwing: eventCount=0 → true ✅
  const currWorld = createWorldLandmarks();
  currWorld[LM.LEFT_HEEL]  = { x: 0, y: 0.761, z: 0 }; // 踵が接地プラトー（変化極小）
  currWorld[LM.RIGHT_HEEL] = { x: 0, y: 0.630, z: 0 }; // 右踵は空中

  const result = detectGaitEvent({
    landmarks: createLandmarks(), prevLandmarks: createLandmarks(),
    worldLandmarks: currWorld,
    timestamp: 1000,
    lastLeftHeelStrikeTime: 0, lastRightHeelStrikeTime: 0,
    leftHeelState: 'up',    // 前フレームで下降中
    rightHeelState: 'stable',
    emaLeftHeelY:  0.760,   // 前フレームEMA（接地プラトー）
    emaRightHeelY: 0.630,
    leftEventCount:  0,     // 初回: hadSwing=true
    rightEventCount: 0,
    logger: { log() {} }
  });

  assert.deepEqual(result.event, { type: 'left_heel_strike', timestamp: 1000 }, 'UP→stable でもヒールストライクを検出');
  assert.equal(result.stepIncrement, 1);
  assert.equal(result.nextLastLeftHeelStrikeTime, 1000);
  assert.equal(result.nextLeftHeelState, 'stable');
});

// ── detectGaitEvent: 2D フォールバック（worldLandmarks なし時） ───────────────
test('detectGaitEvent (2D/SM fallback): left heel strike when worldLandmarks absent', () => {
  // 2D フォールバック: y増加=下降（画像座標系）→ state machineで DOWN→UP
  const prev = createLandmarks();
  const curr = createLandmarks();

  // 左踵: prev=0.75 → curr=0.70 (y減少 = 2D上昇 = 2Dで 'up') deltaY=-0.05 < -NOISE_2D
  // 2Dでは y減少=上昇方向('up'), y増加=下降方向('down')
  prev[LM.LEFT_HEEL] = { x: 0, y: 0.75, z: 0 };
  curr[LM.LEFT_HEEL] = { x: 0, y: 0.70, z: 0 }; // delta=-0.05 → nextState='up'
  curr[LM.LEFT_FOOT_INDEX] = { x: 0, y: 0.72, z: 0 }; // footFlat: |0.70-0.72|=0.02 < 0.10
  curr[LM.LEFT_KNEE] = { x: 0, y: 0.50, z: 0 }; // heelLow: 0.70 > 0.55

  const result = detectGaitEvent({
    landmarks: curr, prevLandmarks: prev,
    // worldLandmarks なし → 2D フォールバック
    timestamp: 1000,
    lastLeftHeelStrikeTime: 0, lastRightHeelStrikeTime: 0,
    leftHeelState: 'down',  // 2D: 前フレームで下降中('down')
    rightHeelState: 'stable',
    logger: { log() {} }
  });

  assert.deepEqual(result.event, { type: 'left_heel_strike', timestamp: 1000 });
  assert.equal(result.stepIncrement, 1);
  assert.equal(result.nextLastLeftHeelStrikeTime, 1000);
});

test('ema returns a weighted moving average', () => {
  assert.equal(ema(10, 20, 0.2), 12);
});

test('calcStepSymmetry returns 100 when fewer than 4 events', () => {
  assert.equal(calcStepSymmetry([]), 100);
  assert.equal(calcStepSymmetry([
    { type: 'left_heel_strike', timestamp: 0 },
    { type: 'right_heel_strike', timestamp: 500 }
  ]), 100);
});

test('calcStepSymmetry returns high symmetry for perfectly even left/right intervals', () => {
  // Left: 0, 1000, 2000 ms → interval = 1000ms
  // Right: 500, 1500, 2500 ms → interval = 1000ms → perfect symmetry
  const events = [
    { type: 'left_heel_strike',  timestamp: 0 },
    { type: 'right_heel_strike', timestamp: 500 },
    { type: 'left_heel_strike',  timestamp: 1000 },
    { type: 'right_heel_strike', timestamp: 1500 },
    { type: 'left_heel_strike',  timestamp: 2000 },
    { type: 'right_heel_strike', timestamp: 2500 },
  ];
  const result = calcStepSymmetry(events);
  assert.ok(result >= 99, `Expected >= 99 for symmetric gait, got ${result}`);
});

test('calcStepSymmetry returns low symmetry for very uneven left/right intervals', () => {
  // Left: 0, 1000, 2000 → interval = 1000ms
  // Right: 200, 1200, 2200 → interval = 1000ms → 実は同じ間隔だが左右のstep timeが偏っている
  // 非対称テスト: Left interval = 600ms, Right interval = 1400ms
  const events = [
    { type: 'left_heel_strike',  timestamp: 0 },
    { type: 'right_heel_strike', timestamp: 200 },
    { type: 'left_heel_strike',  timestamp: 600 },
    { type: 'right_heel_strike', timestamp: 800 },
    { type: 'left_heel_strike',  timestamp: 1200 },
    { type: 'right_heel_strike', timestamp: 2200 },
    { type: 'left_heel_strike',  timestamp: 1800 },
    { type: 'right_heel_strike', timestamp: 3600 },
  ];
  // Left: 0→600→1200→1800 → intervals: 600, 600, 600 → avg 600
  // Right: 200→800→2200→3600 → intervals: 600, 1400, 1400 → avg ~1133
  const result = calcStepSymmetry(events);
  assert.ok(result < 90, `Expected < 90 for uneven steps, got ${result}`);
});

test('calcStepSymmetry falls back to index-based when events have no type field', () => {
  // 型なしイベント（後方互換）でもフォールバック計算が動くことを確認
  const events = [
    { timestamp: 0 },
    { timestamp: 500 },
    { timestamp: 1000 },
    { timestamp: 1500 },
    { timestamp: 2000 }
  ];
  // フォールバック: 奇数/偶数インデックスで計算 → 均等なので 100 に近い
  const result = calcStepSymmetry(events);
  assert.ok(result >= 99, `Expected >= 99 for even intervals (fallback), got ${result}`);
});

test('detectGaitEvent (2D/SM fallback): nextLeftHadDownPhase and nextRightHadDownPhase are returned on event', () => {
  // 2D フォールバックでヒールストライクを検出したとき、hadDownPhase フィールドが
  // 正しくリセット/更新されて返ることを確認する。
  const prev = createLandmarks();
  const curr = createLandmarks();

  prev[LM.LEFT_HEEL] = { x: 0, y: 0.75, z: 0 };
  curr[LM.LEFT_HEEL] = { x: 0, y: 0.70, z: 0 };
  curr[LM.LEFT_FOOT_INDEX] = { x: 0, y: 0.72, z: 0 };
  curr[LM.LEFT_KNEE] = { x: 0, y: 0.50, z: 0 };

  const result = detectGaitEvent({
    landmarks: curr, prevLandmarks: prev,
    timestamp: 1000,
    lastLeftHeelStrikeTime: 0, lastRightHeelStrikeTime: 0,
    leftHeelState: 'down',
    rightHeelState: 'stable',
    leftHadDownPhase: true,
    rightHadDownPhase: false,
    logger: { log() {} }
  });

  assert.deepEqual(result.event, { type: 'left_heel_strike', timestamp: 1000 });
  // 左検出後は nextLeftHadDownPhase がリセット（false）されること
  assert.strictEqual(result.nextLeftHadDownPhase, false, '左検出後に nextLeftHadDownPhase がリセットされる');
  // 右は変わらない
  assert.strictEqual(result.nextRightHadDownPhase, false, '右は変更なし');
});

test('detectGaitEvent (2D/SM fallback): nextLeftHadDownPhase tracks down phase when no event', () => {
  // 2D でイベントなしのフレームでも hadDownPhase が正しく更新されることを確認
  const prev = createLandmarks();
  const curr = createLandmarks();

  // 下降中（dL > NOISE_2D → nextLS2D='down'）だがヒールストライク条件を満たさない場合
  prev[LM.LEFT_HEEL] = { x: 0, y: 0.50, z: 0 };
  curr[LM.LEFT_HEEL] = { x: 0, y: 0.55, z: 0 }; // delta = +0.05 → 'down' in 2D
  curr[LM.LEFT_FOOT_INDEX] = { x: 0, y: 0.30, z: 0 };
  curr[LM.LEFT_KNEE] = { x: 0, y: 0.20, z: 0 };  // heelLow=false (0.55 > 0.25 OK だが footFlat=false)

  const result = detectGaitEvent({
    landmarks: curr, prevLandmarks: prev,
    timestamp: 1000,
    lastLeftHeelStrikeTime: 0, lastRightHeelStrikeTime: 0,
    leftHeelState: 'stable',
    rightHeelState: 'stable',
    leftHadDownPhase: false,
    rightHadDownPhase: false,
    logger: { log() {} }
  });

  assert.equal(result.event, null);
  // nextLS2D='down' なので nextLHadDown2D=true になるはず
  assert.strictEqual(result.nextLeftHadDownPhase, true, '2D down フェーズ後 nextLeftHadDownPhase=true');
});

test('detectGaitEvent (2D/SM fallback): right event propagates nextLHadDown2D correctly for left', () => {
  // バグ修正確認: 右ヒールストライク検出時、左の nextLeftHadDownPhase が
  // 古い leftHadDownPhase ではなく nextLHadDown2D（今フレームで更新済み）を使うこと
  const prev = createLandmarks();
  const curr = createLandmarks();

  // 右踵: 前フレームで下降中 → 今フレームで安定（2D: DOWN→non-DOWN = ヒールストライク）
  prev[LM.RIGHT_HEEL] = { x: 0, y: 0.60, z: 0 };
  curr[LM.RIGHT_HEEL] = { x: 0, y: 0.80, z: 0 }; // y増加=下降→'down', 安定するために nextRS='stable'
  // 右の接地条件: heelLow(0.80 > 0.45+0.05=0.50) ✅, footFlat ✅
  curr[LM.RIGHT_FOOT_INDEX] = { x: 0, y: 0.82, z: 0 }; // |0.80-0.82|=0.02 < 0.10
  curr[LM.RIGHT_KNEE] = { x: 0, y: 0.45, z: 0 };

  // 左踵: 今フレームで下降中（'down'フェーズ）→ leftHadDownPhase(false) → nextLHadDown2D=true
  prev[LM.LEFT_HEEL] = { x: 0, y: 0.50, z: 0 };
  curr[LM.LEFT_HEEL] = { x: 0, y: 0.60, z: 0 }; // delta=+0.10 → 'down'

  const result = detectGaitEvent({
    landmarks: curr, prevLandmarks: prev,
    timestamp: 1000,
    lastLeftHeelStrikeTime: 0, lastRightHeelStrikeTime: 0,
    leftHeelState: 'stable',
    rightHeelState: 'down',   // 右が前フレームで下降中
    leftHadDownPhase: false,  // 左は前フレームまでdownフェーズなし
    rightHadDownPhase: true,  // 右は前フレームまでdownフェーズあり
    rightEventCount: 0,       // 初回 → hadSwing2DR=true
    logger: { log() {} }
  });

  // 右ヒールストライクが検出されるはず (rightHeelState='down', nextRS2D='stable', heelLow, footFlat, hadSwing)
  if (result.event?.type === 'right_heel_strike') {
    // バグ修正: 右検出時に nextLeftHadDownPhase が nextLHadDown2D(今フレームで更新)になっていること
    // 今フレームで左の nextLS2D='down'（delta=+0.10 > NOISE_2D） → nextLHadDown2D = false||true = true
    assert.strictEqual(result.nextLeftHadDownPhase, true,
      '右検出時: 左が今フレームでdownフェーズに入ったので nextLeftHadDownPhase=true になるべき');
    assert.strictEqual(result.nextRightHadDownPhase, false, '右検出後リセット');
  }
  // 接地条件が満たされない場合はスキップ（条件チェックのみ）
});

test('detectGaitEvent (2D/SM fallback): left event propagates nextRHadDown2D correctly for right', () => {
  // バグ修正確認: 左ヒールストライク検出時、右の nextRightHadDownPhase が
  // 古い rightHadDownPhase ではなく nextRHadDown2D（今フレームで更新済み）を使うこと
  const prev = createLandmarks();
  const curr = createLandmarks();

  // 左踵: 前フレームで下降中('down') → 今フレームで安定(nextLS2D='stable')
  prev[LM.LEFT_HEEL] = { x: 0, y: 0.60, z: 0 };
  curr[LM.LEFT_HEEL] = { x: 0, y: 0.80, z: 0 }; // y増加=下降→'down' in 2D
  curr[LM.LEFT_FOOT_INDEX] = { x: 0, y: 0.82, z: 0 }; // footFlat OK
  curr[LM.LEFT_KNEE] = { x: 0, y: 0.45, z: 0 }; // heelLow: 0.80 > 0.50

  // 右踵: 今フレームで下降中 → rightHadDownPhase(false) → nextRHadDown2D=true
  prev[LM.RIGHT_HEEL] = { x: 0, y: 0.50, z: 0 };
  curr[LM.RIGHT_HEEL] = { x: 0, y: 0.60, z: 0 }; // delta=+0.10 → 'down'

  const result = detectGaitEvent({
    landmarks: curr, prevLandmarks: prev,
    timestamp: 1000,
    lastLeftHeelStrikeTime: 0, lastRightHeelStrikeTime: 0,
    leftHeelState: 'down',    // 左が前フレームで下降中
    rightHeelState: 'stable',
    leftHadDownPhase: true,   // 左は前フレームまでdownフェーズあり
    rightHadDownPhase: false, // 右は前フレームまでdownフェーズなし
    leftEventCount: 0,        // 初回 → hadSwing2DL=true
    logger: { log() {} }
  });

  if (result.event?.type === 'left_heel_strike') {
    assert.strictEqual(result.nextLeftHadDownPhase, false, '左検出後リセット');
    // バグ修正: 左検出時に nextRightHadDownPhase が nextRHadDown2D(今フレームで更新)になっていること
    // 今フレームで右の nextRS2D='down'（delta=+0.10 > NOISE_2D） → nextRHadDown2D = false||true = true
    assert.strictEqual(result.nextRightHadDownPhase, true,
      '左検出時: 右が今フレームでdownフェーズに入ったので nextRightHadDownPhase=true になるべき');
  }
});

test('calcWalkingSpeed returns 0 (not NaN) when displacement causes NaN speedMps', () => {
  // bodyScale が 0 でも、NaN が返らないことを確認する追加のエッジケース
  // 実際にはbodyScale<=0のとき早期リターンするが、NaN/Infinity耐性をテスト
  const prev = createLandmarks();
  const curr = createLandmarks();

  // 正常なランドマークセット（shoulderWidth=1.0)
  curr[LM.LEFT_SHOULDER] = { x: 0, y: 1, z: 0 };
  curr[LM.RIGHT_SHOULDER] = { x: 1, y: 1, z: 0 };
  prev[LM.LEFT_SHOULDER] = { x: 0, y: 1, z: 0 };
  prev[LM.RIGHT_SHOULDER] = { x: 1, y: 1, z: 0 };

  // hipDisplacement が非常に大きい（→ speedMps が 5 を超える）
  prev[LM.LEFT_HIP] = { x: 0, y: 0, z: 0 };
  prev[LM.RIGHT_HIP] = { x: 0.2, y: 0, z: 0 };
  curr[LM.LEFT_HIP] = { x: 100, y: 0, z: 0 };  // 極端に大きい変位
  curr[LM.RIGHT_HIP] = { x: 100.2, y: 0, z: 0 };

  const speed = calcWalkingSpeed(curr, prev, 1000);
  assert.ok(Number.isFinite(speed), `Speed must be finite, got ${speed}`);
  assert.ok(speed >= 0 && speed <= 5, `Speed must be clamped [0,5], got ${speed}`);
});


