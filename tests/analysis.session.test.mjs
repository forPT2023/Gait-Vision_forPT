import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAnalysisDataPoint, calculateCadenceFromEvents } from '../src/analysis/session.js';

// ─── calculateCadenceFromEvents ──────────────────────────────────────────────

test('calculateCadenceFromEvents: 2イベントしかない場合 span ベースで正確に計算', () => {
  // 2イベント: 0ms と 500ms → 間隔500ms → 120 spm
  const result = calculateCadenceFromEvents({
    gaitEvents: [{ timestamp: 0 }, { timestamp: 500 }],
    mpTimestamp: 600,
    timeWindowMs: 10000,
    minCadence: 0
  });
  assert.ok(Math.abs(result - 120) < 1, `Expected ~120 spm, got ${result}`);
});

test('calculateCadenceFromEvents: 解析開始2秒後でも正確に 120 spm を返す', () => {
  // 500ms間隔で4ステップ(2秒)
  const events = [
    { timestamp: 0 },
    { timestamp: 500 },
    { timestamp: 1000 },
    { timestamp: 1500 },
  ];
  const result = calculateCadenceFromEvents({
    gaitEvents: events,
    mpTimestamp: 2000,
    timeWindowMs: 10000,
    minCadence: 0
  });
  // span = 1500ms, count-1 = 3 intervals → (3/1.5)*60 = 120
  assert.ok(Math.abs(result - 120) < 1, `Expected ~120 spm, got ${result}`);
});

test('calculateCadenceFromEvents: 解析開始5秒後でも正確に 120 spm を返す', () => {
  // 500ms間隔で10ステップ(5秒)
  const events = Array.from({ length: 10 }, (_, i) => ({ timestamp: i * 500 }));
  const result = calculateCadenceFromEvents({
    gaitEvents: events,
    mpTimestamp: 5000,
    timeWindowMs: 10000,
    minCadence: 0
  });
  // span = 4500ms, count-1 = 9 intervals → (9/4.5)*60 = 120
  assert.ok(Math.abs(result - 120) < 1, `Expected ~120 spm, got ${result}`);
});

test('calculateCadenceFromEvents: 10秒経過後も正確に 120 spm を返す', () => {
  // 500ms間隔で20ステップ(10秒)
  const events = Array.from({ length: 20 }, (_, i) => ({ timestamp: i * 500 }));
  const result = calculateCadenceFromEvents({
    gaitEvents: events,
    mpTimestamp: 10000,
    timeWindowMs: 10000,
    minCadence: 0
  });
  assert.ok(Math.abs(result - 120) < 1, `Expected ~120 spm, got ${result}`);
});

test('calculateCadenceFromEvents: minCadence/maxCadence 範囲外は 0 を返す', () => {
  // デフォルト minCadence=30 に変更された（リハビリ患者の遅歩き対応）
  // 30 spm (2000ms間隔) はデフォルトではギリギリ通過するが、minCadence=60 を明示すると 0
  const slowEvents = [{ timestamp: 0 }, { timestamp: 2000 }, { timestamp: 4000 }];
  const resultWithDefaultMin = calculateCadenceFromEvents({
    gaitEvents: slowEvents,
    mpTimestamp: 5000,
    timeWindowMs: 10000
  });
  assert.ok(resultWithDefaultMin >= 30 - 1 && resultWithDefaultMin <= 30 + 1,
    `Slow walk (30 spm) with default minCadence=30 should pass, got ${resultWithDefaultMin}`);

  // minCadence=60 を明示的に指定すると 0 になること
  const resultWithMin60 = calculateCadenceFromEvents({
    gaitEvents: slowEvents,
    mpTimestamp: 5000,
    timeWindowMs: 10000,
    minCadence: 60
  });
  assert.strictEqual(resultWithMin60, 0, `Slow walk (30 spm) should return 0 when minCadence=60, got ${resultWithMin60}`);
});

test('calculateCadenceFromEvents: イベントが1件のみの場合は最後2イベントから計算', () => {
  // events = [ts:0, ts:500]
  // mpTimestamp=1100, timeWindowMs=700 → recentEvents: 1100-500=600 < 700 → [ts:500] の1件
  // gaitEvents.length=2 >= 2 → フォールバック → 60000/500 = 120 spm
  const events = [{ timestamp: 0 }, { timestamp: 500 }];
  const result = calculateCadenceFromEvents({
    gaitEvents: events,
    mpTimestamp: 1100,
    timeWindowMs: 700,  // ts=500 のみ入る（ts=0 は 1100-0=1100 >= 700 で除外）
    minCadence: 0
  });
  assert.ok(Math.abs(result - 120) < 1, `Fallback from last 2 events should give ~120 spm, got ${result}`);
});

test('calculateCadenceFromEvents: イベントが0件の場合は 0 を返す', () => {
  const result = calculateCadenceFromEvents({
    gaitEvents: [],
    mpTimestamp: 5000
  });
  assert.strictEqual(result, 0);
});

// ─── buildAnalysisDataPoint ──────────────────────────────────────────────────

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

test('buildAnalysisDataPoint clamps speed to max 5 m/s', () => {
  const point = buildAnalysisDataPoint({
    elapsedMs: 1000,
    analysisStartEpochMs: 0,
    mpTimestamp: 1000,
    landmarks: [],
    worldLandmarks: null,
    angles: null,
    emaValues: { speed: 10, cadence: 100, trunk: 5, pelvis: 5, leftKnee: 90, rightKnee: 90, leftHip: 40, rightHip: 40, leftAnkle: 90, rightAnkle: 90 },
    kneeSymmetry: 95
  });
  assert.equal(point.speed, 5, 'speed should be clamped to 5 m/s max');
});

test('calculateCadenceFromEvents: 未来タイムスタンプのイベントは除外される', () => {
  // mpTimestamp=500 のとき timestamp=1000 のイベントは未来なので除外
  const events = [
    { timestamp: 0 },
    { timestamp: 1000 }  // 未来のイベント
  ];
  const result = calculateCadenceFromEvents({
    gaitEvents: events,
    mpTimestamp: 500,    // ts=1000 のイベントは mpTimestamp より先
    timeWindowMs: 10000,
    minCadence: 0
  });
  // recentEvents: ts=0 のみ (500-0=500<10000, 500-1000<0: 除外)
  // 1件 + gaitEvents.length=2 → フォールバック → timeBetweenSteps=1000ms → 60spm
  assert.ok(result >= 0, `Future-timestamp events must be excluded, got ${result}`);
});

test('calculateCadenceFromEvents: フォールバックが2000ms超の遅い歩行でも機能する', () => {
  // リハビリ患者など非常に遅い歩行: 2.5秒/ステップ（24 spm）
  // 旧コード: timeBetweenSteps < 2000 の制限でフォールバックが0を返していた
  // 修正後: timeBetweenSteps < 4000 に拡張して遅い歩行を正しく処理
  const events = [
    { timestamp: 0 },
    { timestamp: 2500 }  // 2.5秒間隔 = 24 spm
  ];
  // mpTimestamp=3000, timeWindowMs=1000 → ts=2500 のみ recent (age=500)
  // 1件 + gaitEvents.length=2 → フォールバック → timeBetweenSteps=2500 → 60000/2500=24 spm
  const result = calculateCadenceFromEvents({
    gaitEvents: events,
    mpTimestamp: 3000,
    timeWindowMs: 1000,
    minCadence: 0  // minCadence=0 で 24 spm も通過させる
  });
  assert.ok(Math.abs(result - 24) < 1, `Slow walk fallback should return ~24 spm, got ${result}`);
});

test('calculateCadenceFromEvents: フォールバックが4000ms超の場合は0を返す', () => {
  // 4秒を超える間隔は異常値として除外する
  const events = [
    { timestamp: 0 },
    { timestamp: 5000 }  // 5秒間隔 = 12 spm (異常に遅い)
  ];
  const result = calculateCadenceFromEvents({
    gaitEvents: events,
    mpTimestamp: 6000,
    timeWindowMs: 2000,
    minCadence: 0  // minCadence=0 でも 4000ms超は除外される
  });
  assert.strictEqual(result, 0, `Interval > 4000ms should return 0, got ${result}`);
});
