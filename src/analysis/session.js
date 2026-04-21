export function calculateCadenceFromEvents({
  gaitEvents,
  mpTimestamp,
  timeWindowMs = 10000,
  minCadence = 30,
  maxCadence = 200
}) {
  // 現在タイムスタンプ以前かつ timeWindowMs 以内のイベントのみを対象にする
  // (mpTimestamp - event.timestamp) が負のイベント（将来のタイムスタンプ）は除外
  const recentEvents = gaitEvents.filter((event) => {
    const age = mpTimestamp - event.timestamp;
    return age >= 0 && age < timeWindowMs;
  });

  let cadence = 0;
  if (recentEvents.length >= 2) {
    // 実際のイベント時間スパン（最初〜最後のイベント間隔）を基準に計算する。
    // 以前は常に timeWindowMs(10秒) で割っていたため、解析開始後10秒未満では
    // イベント数が少なく cadence が大幅に過小評価されていた（例: 5秒時点で半分）。
    // 修正: (イベント数-1) / 実際のスパン(秒) × 60 = ステップ/分
    const spanMs = recentEvents[recentEvents.length - 1].timestamp - recentEvents[0].timestamp;
    if (spanMs > 100) {
      cadence = ((recentEvents.length - 1) / (spanMs / 1000)) * 60;
    }
  } else if (recentEvents.length === 1 && gaitEvents.length >= 2) {
    // ウィンドウ内に1件しかない場合は直近2イベントの間隔からケイデンスを推定する。
    // 上限を 4000ms に拡張: リハビリ患者の遅歩き（15 spm 相当）まで対応。
    // timeBetweenSteps < 2000 の旧制限は 30 spm (=2000ms) が通過できず
    // minCadence=30 のデフォルト設定と矛盾していた。
    const lastTwo = gaitEvents.slice(-2);
    const timeBetweenSteps = lastTwo[1].timestamp - lastTwo[0].timestamp;
    if (timeBetweenSteps > 0 && timeBetweenSteps < 4000) {
      cadence = 60000 / timeBetweenSteps;
    }
  }

  if (!Number.isFinite(cadence) || cadence < minCadence || cadence > maxCadence) {
    return 0;
  }

  return cadence;
}

function clampMetric(value, min, max, fallback = 0) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

export function buildAnalysisDataPoint({
  elapsedMs,
  analysisStartEpochMs,
  mpTimestamp,
  landmarks,
  worldLandmarks,
  angles,
  emaValues,
  kneeSymmetry
}) {
  // kneeSymmetry === null は「未計算」（歩行イベントなし・矢状面で片側ゼロ等）を意味する。
  // null をそのまま格納し、averageMetric や pushPoint 側で除外することで
  // デフォルト100が平均値・チャートに混入するのを防ぐ。
  const symmetryValue = (kneeSymmetry === null)
    ? null
    : clampMetric(kneeSymmetry, 0, 100, null);

  return {
    timestamp: elapsedMs,
    recordedAt: analysisStartEpochMs + elapsedMs,
    elapsedMs,
    mpTimestamp,
    landmarks,
    worldLandmarks,
    angles,
    speed: clampMetric(emaValues.speed, 0, 5),
    cadence: clampMetric(emaValues.cadence, 0, 200),
    symmetry: symmetryValue,
    trunk: clampMetric(emaValues.trunk, 0, 45),
    pelvis: clampMetric(emaValues.pelvis, 0, 30),
    leftKnee: clampMetric(emaValues.leftKnee, 0, 180),
    rightKnee: clampMetric(emaValues.rightKnee, 0, 180),
    leftHip: clampMetric(emaValues.leftHip, 0, 180),
    rightHip: clampMetric(emaValues.rightHip, 0, 180),
    leftAnkle: clampMetric(emaValues.leftAnkle, 0, 180),
    rightAnkle: clampMetric(emaValues.rightAnkle, 0, 180)
  };
}
