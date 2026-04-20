import { LM } from './constants.js';

export function calcAngle3D(a, b, c) {
  if (!a || !b || !c ||
      typeof a.x !== 'number' || typeof a.y !== 'number' || typeof a.z !== 'number' ||
      typeof b.x !== 'number' || typeof b.y !== 'number' || typeof b.z !== 'number' ||
      typeof c.x !== 'number' || typeof c.y !== 'number' || typeof c.z !== 'number') {
    return 0;
  }

  const ba = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const bc = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
  const dot = ba.x * bc.x + ba.y * bc.y + ba.z * bc.z;
  const magBA = Math.sqrt(ba.x * ba.x + ba.y * ba.y + ba.z * ba.z);
  const magBC = Math.sqrt(bc.x * bc.x + bc.y * bc.y + bc.z * bc.z);

  if (magBA === 0 || magBC === 0 || Number.isNaN(magBA) || Number.isNaN(magBC)) return 0;

  const cosAngle = dot / (magBA * magBC);
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
  return Number.isFinite(angle) ? angle : 0;
}

export function calcJointAngles(worldLandmarks) {
  if (!worldLandmarks || worldLandmarks.length < 33) return null;

  return {
    leftHip: calcAngle3D(worldLandmarks[LM.LEFT_SHOULDER], worldLandmarks[LM.LEFT_HIP], worldLandmarks[LM.LEFT_KNEE]),
    rightHip: calcAngle3D(worldLandmarks[LM.RIGHT_SHOULDER], worldLandmarks[LM.RIGHT_HIP], worldLandmarks[LM.RIGHT_KNEE]),
    leftKnee: calcAngle3D(worldLandmarks[LM.LEFT_HIP], worldLandmarks[LM.LEFT_KNEE], worldLandmarks[LM.LEFT_ANKLE]),
    rightKnee: calcAngle3D(worldLandmarks[LM.RIGHT_HIP], worldLandmarks[LM.RIGHT_KNEE], worldLandmarks[LM.RIGHT_ANKLE]),
    leftAnkle: calcAngle3D(worldLandmarks[LM.LEFT_KNEE], worldLandmarks[LM.LEFT_ANKLE], worldLandmarks[LM.LEFT_FOOT_INDEX]),
    rightAnkle: calcAngle3D(worldLandmarks[LM.RIGHT_KNEE], worldLandmarks[LM.RIGHT_ANKLE], worldLandmarks[LM.RIGHT_FOOT_INDEX])
  };
}

/**
 * calcTrunkAngle – 体幹傾斜角度を撮影平面に応じて計算する。
 *
 * 前額面（frontal）: カメラが正面を向いているため X-Y 平面での左右側方傾斜を計算。
 *   肩中点→股関節中点 ベクトルの X 成分（左右）と Y 成分（上下）からatan2。
 *   Trendelenburg 的な体幹の左右傾きを反映する。
 *
 * 矢状面（sagittal）: カメラが側面を向いているため Y-Z 平面での前後傾を計算。
 *   肩中点→股関節中点 ベクトルの Z 成分（前後）と Y 成分（上下）からatan2。
 *   体幹前傾・後傾を反映する。
 *
 * @param {Array} worldLandmarks - MediaPipe world landmarks
 * @param {'frontal'|'sagittal'} plane - 撮影平面
 * @returns {number} 傾斜角度 (°)、0以上
 */
export function calcTrunkAngle(worldLandmarks, plane = 'frontal') {
  if (!worldLandmarks || worldLandmarks.length < 33) return 0;

  const shoulderMid = {
    x: (worldLandmarks[LM.LEFT_SHOULDER].x + worldLandmarks[LM.RIGHT_SHOULDER].x) / 2,
    y: (worldLandmarks[LM.LEFT_SHOULDER].y + worldLandmarks[LM.RIGHT_SHOULDER].y) / 2,
    z: (worldLandmarks[LM.LEFT_SHOULDER].z + worldLandmarks[LM.RIGHT_SHOULDER].z) / 2
  };
  const hipMid = {
    x: (worldLandmarks[LM.LEFT_HIP].x + worldLandmarks[LM.RIGHT_HIP].x) / 2,
    y: (worldLandmarks[LM.LEFT_HIP].y + worldLandmarks[LM.RIGHT_HIP].y) / 2,
    z: (worldLandmarks[LM.LEFT_HIP].z + worldLandmarks[LM.RIGHT_HIP].z) / 2
  };

  // 肩→股関節 の「上下幅」（絶対値）を基準軸として使用。
  // MediaPipe world coords では Y軸下向き正（腰が原点、肩は腰より上=Y負値）のため、
  // shoulderMid.y < hipMid.y となり dy = shoulderMid.y - hipMid.y が負値になる。
  // atan2(offset, dy) に負の dy を渡すと ~180° になるため、|dy| を使用して
  // 「体幹の縦方向の距離」を正値として扱う。
  const absVertical = Math.abs(shoulderMid.y - hipMid.y);
  let angle;

  if (plane === 'sagittal') {
    // 矢状面: 前後傾を計算（Y-Z 平面）。
    // dz = shoulderMid.z - hipMid.z
    //   dz > 0 → 肩が股より前方（体幹前傾）
    //   dz < 0 → 肩が股より後方（体幹後傾）
    // atan2(dz, absVertical): absVertical > 0 なので角度は ±90° 以内に収まる。
    // 傾き角度 = |atan2(dz, |縦距離|)|
    const dz = shoulderMid.z - hipMid.z;
    angle = Math.abs(Math.atan2(dz, absVertical) * (180 / Math.PI));
  } else {
    // 前額面: 左右側方傾斜を計算（X-Y 平面）。
    // dx = shoulderMid.x - hipMid.x
    //   dx ≠ 0 → 体幹が左右に傾いている（Trendelenburg 的動揺）
    // atan2(dx, absVertical): 直立時 dx≈0 → angle≈0°、左右傾き時に角度増大。
    const dx = shoulderMid.x - hipMid.x;
    angle = Math.abs(Math.atan2(dx, absVertical) * (180 / Math.PI));
  }

  return Number.isFinite(angle) ? angle : 0;
}

export function calcPelvicTilt(worldLandmarks, plane = 'frontal') {
  if (!worldLandmarks || worldLandmarks.length < 33) return 0;
  const dy = worldLandmarks[LM.RIGHT_HIP].y - worldLandmarks[LM.LEFT_HIP].y;
  if (plane === 'sagittal') {
    // 矢状面（側面撮影）: 骨盤前後傾を Y-Z 平面で計算
    // 左右 HIP は奥行き方向（Z）に並ぶ。前側 HIP が上（Y小）になると前傾
    // |dz| を使うことで左右どちらのHIPがカメラ側でも符号に依存しない角度を得る
    const dz = worldLandmarks[LM.RIGHT_HIP].z - worldLandmarks[LM.LEFT_HIP].z;
    const absDz = Math.abs(dz);
    if (absDz < 1e-6) return 0; // 奥行き差がほぼゼロ（正面向き）は計算不能
    return Math.abs(Math.atan2(dy, absDz) * (180 / Math.PI));
  }
  // 前額面（正面撮影）: 骨盤左右傾斜を X-Y 平面で計算
  const dx = worldLandmarks[LM.RIGHT_HIP].x - worldLandmarks[LM.LEFT_HIP].x;
  return Math.abs(Math.atan2(dy, dx) * (180 / Math.PI));
}

export function calcWalkingSpeed(worldLandmarks, previousWorldLandmarks, deltaT, logger = null) {
  if (!worldLandmarks || !previousWorldLandmarks || !deltaT || deltaT <= 0 || worldLandmarks.length < 33 || previousWorldLandmarks.length < 33) {
    return 0;
  }
  if (deltaT < 8) {
    return 0;
  }

  const hipMid = {
    x: (worldLandmarks[LM.LEFT_HIP].x + worldLandmarks[LM.RIGHT_HIP].x) / 2,
    y: (worldLandmarks[LM.LEFT_HIP].y + worldLandmarks[LM.RIGHT_HIP].y) / 2,
    z: (worldLandmarks[LM.LEFT_HIP].z + worldLandmarks[LM.RIGHT_HIP].z) / 2
  };
  const prevHipMid = {
    x: (previousWorldLandmarks[LM.LEFT_HIP].x + previousWorldLandmarks[LM.RIGHT_HIP].x) / 2,
    y: (previousWorldLandmarks[LM.LEFT_HIP].y + previousWorldLandmarks[LM.RIGHT_HIP].y) / 2,
    z: (previousWorldLandmarks[LM.LEFT_HIP].z + previousWorldLandmarks[LM.RIGHT_HIP].z) / 2
  };

  const hipDisplacementXZ = Math.sqrt(
    Math.pow(hipMid.x - prevHipMid.x, 2) +
    Math.pow(hipMid.z - prevHipMid.z, 2)
  );
  const leftAnkleDisplacementXZ = Math.sqrt(
    Math.pow(worldLandmarks[LM.LEFT_ANKLE].x - previousWorldLandmarks[LM.LEFT_ANKLE].x, 2) +
    Math.pow(worldLandmarks[LM.LEFT_ANKLE].z - previousWorldLandmarks[LM.LEFT_ANKLE].z, 2)
  );
  const rightAnkleDisplacementXZ = Math.sqrt(
    Math.pow(worldLandmarks[LM.RIGHT_ANKLE].x - previousWorldLandmarks[LM.RIGHT_ANKLE].x, 2) +
    Math.pow(worldLandmarks[LM.RIGHT_ANKLE].z - previousWorldLandmarks[LM.RIGHT_ANKLE].z, 2)
  );
  const ankleDisplacementXZ = (leftAnkleDisplacementXZ + rightAnkleDisplacementXZ) / 2;
  const displacementXZ = hipDisplacementXZ > 1e-4
    ? hipDisplacementXZ
    : ankleDisplacementXZ * 0.35;

  const shoulderWidth = Math.sqrt(
    Math.pow(worldLandmarks[LM.LEFT_SHOULDER].x - worldLandmarks[LM.RIGHT_SHOULDER].x, 2) +
    Math.pow(worldLandmarks[LM.LEFT_SHOULDER].y - worldLandmarks[LM.RIGHT_SHOULDER].y, 2) +
    Math.pow(worldLandmarks[LM.LEFT_SHOULDER].z - worldLandmarks[LM.RIGHT_SHOULDER].z, 2)
  );
  const hipWidth = Math.sqrt(
    Math.pow(worldLandmarks[LM.LEFT_HIP].x - worldLandmarks[LM.RIGHT_HIP].x, 2) +
    Math.pow(worldLandmarks[LM.LEFT_HIP].y - worldLandmarks[LM.RIGHT_HIP].y, 2) +
    Math.pow(worldLandmarks[LM.LEFT_HIP].z - worldLandmarks[LM.RIGHT_HIP].z, 2)
  );
  const bodyScale = shoulderWidth > 0.015 ? shoulderWidth : (hipWidth > 0.015 ? hipWidth : 0);

  if (bodyScale <= 0 || Number.isNaN(bodyScale)) {
    return 0;
  }

  const scaledDisplacement = (displacementXZ / bodyScale) * 0.4;
  const speedMps = scaledDisplacement / (deltaT / 1000);

  if (Number.isNaN(speedMps) || !Number.isFinite(speedMps) || speedMps < 0 || speedMps > 5) {
    if (Number.isNaN(speedMps) || !Number.isFinite(speedMps)) return 0;
    return Math.max(0, Math.min(5, speedMps));
  }

  return speedMps;
}

export function calcSymmetryIndex(left, right) {
  if (typeof left !== 'number' || typeof right !== 'number' ||
      Number.isNaN(left) || Number.isNaN(right) || !Number.isFinite(left) || !Number.isFinite(right)) {
    return 100;
  }

  if (left === 0 && right === 0) return 100;
  const mean = (left + right) / 2;
  if (mean === 0) return 100;

  const symmetry = 100 - (Math.abs(left - right) / mean * 100);
  return Math.max(0, Math.min(100, symmetry));
}

export function calcStepSymmetry(gaitEvents) {
  if (!Array.isArray(gaitEvents) || gaitEvents.length < 4) return 100;

  const recent = gaitEvents.slice(-8);

  // event.type（left_heel_strike / right_heel_strike）で左右を明示的に分けて
  // それぞれの平均ステップ間隔を求め対称性を計算する。
  // 以前は奇数/偶数インデックスで分けていたため、左右が連続検出された場合などに
  // 誤った対称性が計算されていた。
  const leftIntervals = [];
  const rightIntervals = [];
  let lastLeftTs = null;
  let lastRightTs = null;

  for (const event of recent) {
    if (event.type === 'left_heel_strike') {
      if (lastLeftTs !== null) {
        const dt = event.timestamp - lastLeftTs;
        if (dt > 100 && dt < 4000) leftIntervals.push(dt);
      }
      lastLeftTs = event.timestamp;
    } else if (event.type === 'right_heel_strike') {
      if (lastRightTs !== null) {
        const dt = event.timestamp - lastRightTs;
        if (dt > 100 && dt < 4000) rightIntervals.push(dt);
      }
      lastRightTs = event.timestamp;
    }
  }

  // 左右それぞれ1区間以上必要
  if (leftIntervals.length === 0 || rightIntervals.length === 0) {
    // フォールバック: 旧来の隣接イベント間隔ベース（左右情報なし）
    const intervals = [];
    for (let i = 1; i < recent.length; i++) {
      const dt = recent[i].timestamp - recent[i - 1].timestamp;
      if (dt > 0 && dt < 2000) intervals.push(dt);
    }
    if (intervals.length < 2) return 100;
    const odd  = intervals.filter((_, i) => i % 2 === 0);
    const even = intervals.filter((_, i) => i % 2 === 1);
    if (odd.length === 0 || even.length === 0) return 100;
    const avgOdd  = odd.reduce((s, v) => s + v, 0) / odd.length;
    const avgEven = even.reduce((s, v) => s + v, 0) / even.length;
    return calcSymmetryIndex(avgOdd, avgEven);
  }

  const avgLeft  = leftIntervals.reduce((s, v) => s + v, 0) / leftIntervals.length;
  const avgRight = rightIntervals.reduce((s, v) => s + v, 0) / rightIntervals.length;
  return calcSymmetryIndex(avgLeft, avgRight);
}

/**
 * detectGaitEvent – EMA平滑化 + state‑machine + swing‑phase方式（v7）
 *
 * 設計方針（v7）:
 *  MediaPipe worldLandmarks.y は「上向き正」座標系（腰が原点、踵は下方向）:
 *    接地時踵Y ≈ +0.75〜+0.85m (正の大きな値)
 *    スウィング最高点踵Y ≈ +0.60〜+0.70m (正の小さな値)
 *  ※ Y反転は不要。生値をそのまま使用する。
 *
 *  1. EMA（α=0.4）で踵Y座標をフレームごとに平滑化し、ノイズを除去する。
 *  2. EMA差分で state 更新（閾値 0.002m）:
 *     d < 0 → 'down'（踵上昇中＝スウィング）
 *     d > 0 → 'up' （踵下降中＝接地方向）
 *  3. UP → non‑UP（'stable' または 'down'）遷移 = ヒールストライク候補。
 *  4. hadDownPhase チェック（静止時誤検出防止）:
 *     直前のイベント以降に 'down'（踵上昇=スウィング）フェーズを経たかどうかを記録。
 *     これは絶対閾値ではなく状態遷移で判断するため、患者の体格や歩容に依存しない。
 *     ただし初回ステップ（eventsL/R が 0）はdownフェーズなしでも検出を許可。
 *  5. heelHigh チェック: 現在EMA踵Y > HEEL_HIGH_THR で接地を確認。
 *  6. minIntervalMs（デフォルト400ms）で左右それぞれ独立に連続検出を防ぐ。
 *  7. worldLandmarks が null の場合は 2D 正規化ランドマークにフォールバック。
 *
 * 外部から渡すべき持ち越し状態:
 *   leftHeelState / rightHeelState: 'stable'|'down'|'up'
 *   emaLeftHeelY / emaRightHeelY: EMAフィルタの前フレーム値
 *   leftSwingPeak / rightSwingPeak: スウィング中の踵Y最小値（デバッグ用、null=未検出）
 *   leftEventCount / rightEventCount: 検出済みイベント数（初回判定に使用）
 *   leftHadDownPhase / rightHadDownPhase: 前回検出以降にdownフェーズを経たか
 */
export function detectGaitEvent({
  landmarks, prevLandmarks,
  worldLandmarks,
  timestamp,
  deltaT = 0,               // フレーム間隔 (ms)。FPS適応型EMAアルファの計算に使用。
  lastHeelStrikeTime      = 0,
  lastLeftHeelStrikeTime  = 0,
  lastRightHeelStrikeTime = 0,
  leftHeelState   = 'stable',
  rightHeelState  = 'stable',
  emaLeftHeelY    = null,   // EMA持ち越し値（null=未初期化）
  emaRightHeelY   = null,
  leftSwingPeak   = null,   // swing‑peak: デバッグ用（踵Y最小値）
  rightSwingPeak  = null,
  leftEventCount  = 0,      // 左足検出済みイベント数（初回判定）
  rightEventCount = 0,
  leftHadDownPhase  = false, // 前回検出以降に'down'フェーズを経たか
  rightHadDownPhase = false,
  logger = console,
  minIntervalMs = 400
}) {
  // EMA alpha – FPS適応型
  // 30fps基準 (α=0.4, τ≈65ms) に合わせるため、フレーム間隔 deltaT に応じてアルファを補正する。
  // 補正式: α_adj = 1 - (1 - α_30fps)^(deltaT / dt_30fps)
  // これにより低FPS環境でもEMAの時定数が30fps時と同等になり、state machine の応答性が保たれる。
  // deltaT が0または無効な場合はデフォルト値 0.4 を使用する。
  const BASE_ALPHA = 0.4;
  const BASE_DT_MS = 33; // 30fps 相当のフレーム間隔
  const EMA_A = (deltaT > 0 && deltaT < 2000)
    ? Math.min(0.95, 1 - Math.pow(1 - BASE_ALPHA, deltaT / BASE_DT_MS))
    : BASE_ALPHA;
  // state 遷移ノイズ閾値（EMA後）
  // 低FPS時はEMAがより大きな変化を1フレームで吸収するため、閾値を緩和する。
  // 基準: 30fps時 0.002m。EMA_A が大きいほど閾値も比例して緩和（最大 0.008m）。
  const NOISE_THR = Math.min(0.008, 0.002 * (EMA_A / BASE_ALPHA));
  // 接地確認・スウィング確認 共通閾値（worldLandmarks.y: 下向き正、単位m）
  // 接地時踵Y ≈ +0.75〜+0.85m、スウィング最高点 ≈ +0.60〜+0.65m
  // ヒールストライク確認: emaY > HEEL_HIGH_THR（踵が地面近く）
  // スウィング確認: swingPeak < HEEL_HIGH_THR（踵が十分上がっていた）
  const HEEL_HIGH_THR = 0.70;

  // ─── 早期リターン用デフォルト ────────────────────────────────────────────────
  const noEvent = {
    event: null,
    nextLastHeelStrikeTime:      lastHeelStrikeTime,
    nextLastLeftHeelStrikeTime:  lastLeftHeelStrikeTime,
    nextLastRightHeelStrikeTime: lastRightHeelStrikeTime,
    nextLeftHeelState:   leftHeelState,
    nextRightHeelState:  rightHeelState,
    nextEmaLeftHeelY:    emaLeftHeelY,
    nextEmaRightHeelY:   emaRightHeelY,
    nextLeftSwingPeak:    leftSwingPeak,
    nextRightSwingPeak:   rightSwingPeak,
    nextLeftEventCount:   leftEventCount,
    nextRightEventCount:  rightEventCount,
    nextLeftHadDownPhase:  leftHadDownPhase,
    nextRightHadDownPhase: rightHadDownPhase,
    stepIncrement: 0
  };

  if (!landmarks || landmarks.length < 33) return noEvent;

  // ─── worldLandmarks EMA + state machine (v6) ────────────────────────────────
  if (worldLandmarks && worldLandmarks.length >= 33) {
    // MediaPipe worldLandmarks.y: 上向き正座標系（腰が原点、踵は下方向=正値）
    // Y反転不要: 生値をそのまま使用
    // 接地時: rawY ≈ +0.75〜+0.85m　スウィング時: rawY ≈ +0.60〜+0.65m
    const rawLY = worldLandmarks[LM.LEFT_HEEL].y;
    const rawRY = worldLandmarks[LM.RIGHT_HEEL].y;

    // EMA初期化（初回フレームは生値をそのまま使う）
    const curEmaL = (emaLeftHeelY  === null) ? rawLY : EMA_A * rawLY + (1 - EMA_A) * emaLeftHeelY;
    const curEmaR = (emaRightHeelY === null) ? rawRY : EMA_A * rawRY + (1 - EMA_A) * emaRightHeelY;

    // EMA差分で state 更新
    // d < 0 → 踵上昇（スウィング） → 'down'
    // d > 0 → 踵下降（接地方向）   → 'up'
    // |d| ≤ NOISE_THR → 'stable'（踵が静止または微振動 = 接地フラット）
    // ※ 以前は |d|≤NOISE_THR のとき前フレームの state を引き継いでいたが、
    //   それだと 'up' に入った後、踵が地面に着いて静止しても 'up' のまま
    //   UP→non-UP 遷移が永久に発火しないバグがあった。
    //   'stable' に明示遷移することで 'up'→'stable' がヒールストライクとして検出される。
    const dL = (emaLeftHeelY  === null) ? 0 : curEmaL - emaLeftHeelY;
    const dR = (emaRightHeelY === null) ? 0 : curEmaR - emaRightHeelY;

    let nextLS;
    if      (dL < -NOISE_THR) nextLS = 'down';    // 踵上昇中（スウィング）
    else if (dL >  NOISE_THR) nextLS = 'up';      // 踵下降中（接地方向）
    else                      nextLS = 'stable';  // 静止/微振動（接地フラット）

    let nextRS;
    if      (dR < -NOISE_THR) nextRS = 'down';    // 踵上昇中（スウィング）
    else if (dR >  NOISE_THR) nextRS = 'up';      // 踵下降中（接地方向）
    else                      nextRS = 'stable';  // 静止/微振動（接地フラット）

    // swing‑peak 更新: スウィング中（'down'）および直後の状態でも踵Y最小値（最も上がった位置）を追跡
    // 低FPS（矢状面動画: ~2-3fps）では 'down' → 'up' → 'stable' を1フレームで飛ばすことがある。
    // そのため 'up' 状態でも更新を継続して最終的なスウィングピークを正確に捉える。
    // 'up' は踵が接地方向へ下降中なので、既に上昇フェーズ（down）を経験後なら追跡継続が妥当。
    // ─── バグ修正: 旧実装は `leftHeelState === 'stable' && nextLS === 'stable'` を追加していたが、
    //              'up'→'stable'（ヒールストライク遷移）でピークが更新されない問題があった。
    //              修正後: 'up' 状態もピーク更新対象に追加し、低FPS環境での欠落を防ぐ。
    let nSwPeakL = leftSwingPeak;
    if (leftHeelState === 'down' || nextLS === 'down' ||
        leftHeelState === 'up'   || nextLS === 'up'   ||
        (leftSwingPeak !== null && (leftHeelState === 'stable' && nextLS === 'stable'))) {
      nSwPeakL = (leftSwingPeak === null) ? curEmaL : Math.min(leftSwingPeak, curEmaL);
    }
    let nSwPeakR = rightSwingPeak;
    if (rightHeelState === 'down' || nextRS === 'down' ||
        rightHeelState === 'up'   || nextRS === 'up'   ||
        (rightSwingPeak !== null && (rightHeelState === 'stable' && nextRS === 'stable'))) {
      nSwPeakR = (rightSwingPeak === null) ? curEmaR : Math.min(rightSwingPeak, curEmaR);
    }

    // heelHigh: EMA後の踵が接地レベル（HEEL_HIGH_THR以上）
    const leftHeelHigh  = curEmaL > HEEL_HIGH_THR;
    const rightHeelHigh = curEmaR > HEEL_HIGH_THR;

    // hadDownPhase: 前回検出以降に 'down'（踵上昇=スウィング）フェーズを経たか
    // 絶対閾値ではなく状態遷移で判断するため、患者の体格や歩容に依存しない。
    // 初回ステップ（eventCount=0）はdownフェーズなしでも検出を許可する。
    const nextLHadDown = leftHadDownPhase  || (nextLS === 'down');
    const nextRHadDown = rightHadDownPhase || (nextRS === 'down');
    const hadSwingL = nextLHadDown || leftEventCount  === 0;
    const hadSwingR = nextRHadDown || rightEventCount === 0;

    // UP→non-UP 遷移の詳細デバッグ（毎フレーム）
    if (leftHeelState === 'up' || nextLS === 'up') {
      logger.log?.(`[GaitDBG-L] ts=${(timestamp/1000).toFixed(2)} prevSt=${leftHeelState} nextSt=${nextLS} emaL=${curEmaL.toFixed(3)} dL=${dL.toFixed(4)} heelHigh=${leftHeelHigh} hadSw=${hadSwingL} hadDn=${nextLHadDown} intv=${timestamp-lastLeftHeelStrikeTime}`);
    }
    if (rightHeelState === 'up' || nextRS === 'up') {
      logger.log?.(`[GaitDBG-R] ts=${(timestamp/1000).toFixed(2)} prevSt=${rightHeelState} nextSt=${nextRS} emaR=${curEmaR.toFixed(3)} dR=${dR.toFixed(4)} heelHigh=${rightHeelHigh} hadSw=${hadSwingR} hadDn=${nextRHadDown} intv=${timestamp-lastRightHeelStrikeTime}`);
    }

    // 左: UP → non‑UP（踵下降が止まる = ヒールストライク）+ heelHigh + hadSwing + minInterval
    if (leftHeelState === 'up' && nextLS !== 'up' && leftHeelHigh &&
        hadSwingL && timestamp - lastLeftHeelStrikeTime > minIntervalMs) {
      logger.log?.('[Gait] Left heel strike at', (timestamp / 1000).toFixed(2),
        's | emaY=', curEmaL.toFixed(3), 'swingPeak=', nSwPeakL?.toFixed(3) ?? 'n/a');
      return {
        event: { type: 'left_heel_strike', timestamp },
        nextLastHeelStrikeTime:      timestamp,
        nextLastLeftHeelStrikeTime:  timestamp,
        nextLastRightHeelStrikeTime: lastRightHeelStrikeTime,
        nextLeftHeelState:   nextLS,
        nextRightHeelState:  nextRS,
        nextEmaLeftHeelY:    curEmaL,
        nextEmaRightHeelY:   curEmaR,
        nextLeftSwingPeak:    null,           // リセット（次スウィング待ち）
        nextRightSwingPeak:   nSwPeakR,
        nextLeftEventCount:   leftEventCount  + 1,
        nextRightEventCount:  rightEventCount,
        nextLeftHadDownPhase:  false,          // リセット（次downフェーズ待ち）
        nextRightHadDownPhase: nextRHadDown,
        stepIncrement: 1
      };
    }

    // 右: UP → non‑UP（踵下降が止まる = ヒールストライク）+ heelHigh + hadSwing + minInterval
    if (rightHeelState === 'up' && nextRS !== 'up' && rightHeelHigh &&
        hadSwingR && timestamp - lastRightHeelStrikeTime > minIntervalMs) {
      logger.log?.('[Gait] Right heel strike at', (timestamp / 1000).toFixed(2),
        's | emaY=', curEmaR.toFixed(3), 'swingPeak=', nSwPeakR?.toFixed(3) ?? 'n/a');
      return {
        event: { type: 'right_heel_strike', timestamp },
        nextLastHeelStrikeTime:      timestamp,
        nextLastLeftHeelStrikeTime:  lastLeftHeelStrikeTime,
        nextLastRightHeelStrikeTime: timestamp,
        nextLeftHeelState:   nextLS,
        nextRightHeelState:  nextRS,
        nextEmaLeftHeelY:    curEmaL,
        nextEmaRightHeelY:   curEmaR,
        nextLeftSwingPeak:   nSwPeakL,
        nextRightSwingPeak:  null,            // リセット（次スウィング待ち）
        nextLeftEventCount:  leftEventCount,
        nextRightEventCount: rightEventCount + 1,
        nextLeftHadDownPhase:  nextLHadDown,
        nextRightHadDownPhase: false,          // リセット（次downフェーズ待ち）
        stepIncrement: 1
      };
    }

    return {
      ...noEvent,
      nextLeftHeelState:   nextLS,
      nextRightHeelState:  nextRS,
      nextEmaLeftHeelY:    curEmaL,
      nextEmaRightHeelY:   curEmaR,
      nextLeftSwingPeak:   nSwPeakL,
      nextRightSwingPeak:  nSwPeakR,
      nextLeftHadDownPhase:  nextLHadDown,
      nextRightHadDownPhase: nextRHadDown
    };
  }

  // ─── フォールバック: 2D normalized landmarks ────────────────────────────────
  if (!prevLandmarks || prevLandmarks.length < 33) return noEvent;

  const leftHeelY  = landmarks[LM.LEFT_HEEL].y;
  const rightHeelY = landmarks[LM.RIGHT_HEEL].y;
  const leftFootY  = landmarks[LM.LEFT_FOOT_INDEX].y;
  const rightFootY = landmarks[LM.RIGHT_FOOT_INDEX].y;
  const leftKneeY  = landmarks[LM.LEFT_KNEE].y;
  const rightKneeY = landmarks[LM.RIGHT_KNEE].y;
  const prevLHY    = prevLandmarks[LM.LEFT_HEEL].y;
  const prevRHY    = prevLandmarks[LM.RIGHT_HEEL].y;

  // 2D: y増加=下降（画像座標系）
  const NOISE_2D = 0.002;
  const dL2D = leftHeelY  - prevLHY;
  const dR2D = rightHeelY - prevRHY;

  let nextLS2D;
  if      (dL2D >  NOISE_2D) nextLS2D = 'down';
  else if (dL2D < -NOISE_2D) nextLS2D = 'up';
  else                        nextLS2D = 'stable';
  let nextRS2D;
  if      (dR2D >  NOISE_2D) nextRS2D = 'down';
  else if (dR2D < -NOISE_2D) nextRS2D = 'up';
  else                        nextRS2D = 'stable';

  // 2D swing‑peak（2D Y: 下向き正なので 小さい値=高い位置 = min を追跡）
  let nSwPeakL2D = leftSwingPeak;
  if (leftHeelState === 'up' || nextLS2D === 'up') {
    // 2D座標は下向き正なので最小値が最高点
    nSwPeakL2D = (leftSwingPeak === null) ? leftHeelY : Math.min(leftSwingPeak, leftHeelY);
  }
  let nSwPeakR2D = rightSwingPeak;
  if (rightHeelState === 'up' || nextRS2D === 'up') {
    nSwPeakR2D = (rightSwingPeak === null) ? rightHeelY : Math.min(rightSwingPeak, rightHeelY);
  }

  // 2D hadDownPhase: 'down'フェーズを経たか追跡（2Dでは 'down'で墘下降=接地方向）
  const nextLHadDown2D = leftHadDownPhase  || (nextLS2D === 'down');
  const nextRHadDown2D = rightHadDownPhase || (nextRS2D === 'down');

  const MIN_SWING_2D = 0.03; // 2D正規化座標でのスウィング最小振れ幅
  const leftHeelLow2D  = leftHeelY  > leftKneeY  + 0.05;
  const rightHeelLow2D = rightHeelY > rightKneeY + 0.05;
  const leftFootFlat2D  = Math.abs(leftHeelY  - leftFootY)  < 0.10;
  const rightFootFlat2D = Math.abs(rightHeelY - rightFootY) < 0.10;

  // 2D swing‑peak: 2D座標でスウィング最低点（最小値）が十分低い（足が上がっていた）
  const hadSwing2DL = (nSwPeakL2D !== null && leftHeelY - nSwPeakL2D > MIN_SWING_2D) || leftEventCount  === 0;
  const hadSwing2DR = (nSwPeakR2D !== null && rightHeelY - nSwPeakR2D > MIN_SWING_2D) || rightEventCount === 0;

  if (leftHeelState === 'down' && nextLS2D !== 'down' && leftHeelLow2D && leftFootFlat2D &&
      hadSwing2DL && timestamp - lastLeftHeelStrikeTime > minIntervalMs) {
    logger.log?.('[Gait] Left heel strike (2D) at', (timestamp / 1000).toFixed(2), 's');
    return {
      event: { type: 'left_heel_strike', timestamp },
      nextLastHeelStrikeTime:      timestamp,
      nextLastLeftHeelStrikeTime:  timestamp,
      nextLastRightHeelStrikeTime: lastRightHeelStrikeTime,
      nextLeftHeelState:   nextLS2D,
      nextRightHeelState:  nextRS2D,
      nextEmaLeftHeelY:    null,
      nextEmaRightHeelY:   null,
      nextLeftSwingPeak:   null,
      nextRightSwingPeak:  nSwPeakR2D,
      nextLeftEventCount:  leftEventCount  + 1,
      nextRightEventCount: rightEventCount,
      nextLeftHadDownPhase:  false,
      nextRightHadDownPhase: nextRHadDown2D,
      stepIncrement: 1
    };
  }
  if (rightHeelState === 'down' && nextRS2D !== 'down' && rightHeelLow2D && rightFootFlat2D &&
      hadSwing2DR && timestamp - lastRightHeelStrikeTime > minIntervalMs) {
    logger.log?.('[Gait] Right heel strike (2D) at', (timestamp / 1000).toFixed(2), 's');
    return {
      event: { type: 'right_heel_strike', timestamp },
      nextLastHeelStrikeTime:      timestamp,
      nextLastLeftHeelStrikeTime:  lastLeftHeelStrikeTime,
      nextLastRightHeelStrikeTime: timestamp,
      nextLeftHeelState:   nextLS2D,
      nextRightHeelState:  nextRS2D,
      nextEmaLeftHeelY:    null,
      nextEmaRightHeelY:   null,
      nextLeftSwingPeak:   nSwPeakL2D,
      nextRightSwingPeak:  null,
      nextLeftEventCount:  leftEventCount,
      nextRightEventCount: rightEventCount + 1,
      nextLeftHadDownPhase:  nextLHadDown2D,
      nextRightHadDownPhase: false,
      stepIncrement: 1
    };
  }

  return {
    ...noEvent,
    nextLeftHeelState:   nextLS2D,
    nextRightHeelState:  nextRS2D,
    nextLeftSwingPeak:   nSwPeakL2D,
    nextRightSwingPeak:  nSwPeakR2D,
    nextLeftHadDownPhase:  nextLHadDown2D,
    nextRightHadDownPhase: nextRHadDown2D
  };
}

export function ema(prev, cur, alpha = 0.2) {
  return alpha * cur + (1 - alpha) * prev;
}

/**
 * calcLandmarkQuality – フレームのランドマーク品質スコア (0.0〜1.0) を計算する。
 *
 * 解析に必須な関節（両肩・両股関節・両膝・両踵）の visibility の平均値を返す。
 * MediaPipe の visibility は検出信頼度 (0〜1) を表す。
 *
 * スコアの解釈:
 *   ≥ QUALITY_THRESHOLD_HIGH (0.7) : 高品質フレーム → 解析データとして採用
 *   ≥ QUALITY_THRESHOLD_LOW  (0.5) : 中品質フレーム → EMA更新のみ（データには追加しない）
 *   <  QUALITY_THRESHOLD_LOW (0.5) : 低品質フレーム → 完全スキップ
 *
 * @param {Array} landmarks - MediaPipe 正規化ランドマーク (visibility フィールドを持つ)
 * @returns {number} 品質スコア 0.0〜1.0。ランドマーク未検出時は 0。
 */
export const QUALITY_THRESHOLD_HIGH = 0.70; // この値以上なら解析データに追加
export const QUALITY_THRESHOLD_LOW  = 0.50; // この値以上なら EMA 更新に使用

export function calcLandmarkQuality(landmarks) {
  if (!landmarks || landmarks.length < 33) return 0;

  // 解析に重要な関節インデックス（左右 肩・股関節・膝・踵）
  const KEY_INDICES = [
    LM.LEFT_SHOULDER,  LM.RIGHT_SHOULDER,
    LM.LEFT_HIP,       LM.RIGHT_HIP,
    LM.LEFT_KNEE,      LM.RIGHT_KNEE,
    LM.LEFT_HEEL,      LM.RIGHT_HEEL
  ];

  let sum = 0;
  let count = 0;
  for (const idx of KEY_INDICES) {
    const lm = landmarks[idx];
    if (lm && typeof lm.visibility === 'number') {
      sum += lm.visibility;
      count++;
    } else {
      // visibility フィールドなし → 中程度のスコアとして扱う (1.0 とはしない)
      sum += 0.5;
      count++;
    }
  }

  return count > 0 ? sum / count : 0;
}

/**
 * KneePeakTracker – ストライドごとの膝関節ピーク値をリアルタイムで追跡するクラス。
 *
 * ─── 角度規約（重要）───────────────────────────────────────────────────────
 *  calcAngle3D(hip, knee, ankle) の戻り値は「hip-knee-ankle の内角」である。
 *    完全伸展（臨床0° flexion）→ hip-knee-ankle ≈ 175〜180°  （ほぼ直線）
 *    最大屈曲（臨床60° flexion）→ hip-knee-ankle ≈ 115〜125°  （鋭角）
 *
 *  したがって:
 *    臨床的屈曲角度(°) = 180° − 生角度(°)
 *
 *  ストライド内で:
 *    生角度の MIN = 最も鋭角 = 最大屈曲（遊脚期ピーク）
 *    生角度の MAX = 最も鈍角 = 最大伸展（立脚期ピーク）
 *
 *  正常値（臨床的屈曲角度に換算後）:
 *    遊脚期最大屈曲: 55〜70° → 生角度110〜125°のMIN
 *    立脚終期最小屈曲（最大伸展残存）: 5〜15° → 生角度165〜175°のMAX
 * ────────────────────────────────────────────────────────────────────────────
 *
 * 注意:
 *  - 「全フレーム平均」とは独立して動作する（EMAとは別のトラッカー）。
 *  - ヒールストライクイベントが0または1回の場合はピーク未確定（null を返す）。
 */
export class KneePeakTracker {
  constructor() {
    // 現ストライド内の生角度追跡バッファ
    // MIN = 最大屈曲の生角度候補（臨床値 = 180 - MIN）
    // MAX = 最大伸展の生角度候補（臨床値 = 180 - MAX）
    this._leftRawMin  = null;
    this._leftRawMax  = null;
    this._rightRawMin = null;
    this._rightRawMax = null;

    // 各ストライドの確定済み臨床値（°）を蓄積
    // swingPeaks: 遊脚期最大屈曲(臨床°) = 180 - ストライド内MIN
    // stanceMins: 立脚終期最小屈曲(臨床°) = 180 - ストライド内MAX
    this._leftSwingPeaks  = [];
    this._leftStanceMins  = [];
    this._rightSwingPeaks = [];
    this._rightStanceMins = [];
  }

  /**
   * 毎フレーム呼び出し。
   * @param {number|null} leftKnee   - 左膝生角度（hip-knee-ankle °, 完全伸展≈180°）
   * @param {number|null} rightKnee  - 右膝生角度
   * @param {object|null} gaitEvent  - 今フレームで検出されたヒールストライクイベント（または null）
   */
  update(leftKnee, rightKnee, gaitEvent) {
    // ─── 現ストライドバッファに生角度を蓄積 ────────────────────────────────
    if (typeof leftKnee === 'number' && leftKnee > 0) {
      this._leftRawMin = (this._leftRawMin === null) ? leftKnee : Math.min(this._leftRawMin, leftKnee);
      this._leftRawMax = (this._leftRawMax === null) ? leftKnee : Math.max(this._leftRawMax, leftKnee);
    }
    if (typeof rightKnee === 'number' && rightKnee > 0) {
      this._rightRawMin = (this._rightRawMin === null) ? rightKnee : Math.min(this._rightRawMin, rightKnee);
      this._rightRawMax = (this._rightRawMax === null) ? rightKnee : Math.max(this._rightRawMax, rightKnee);
    }

    // ─── ヒールストライクでストライド確定 ───────────────────────────────────
    if (!gaitEvent) return;

    if (gaitEvent.type === 'left_heel_strike') {
      this._commitLeft();
    } else if (gaitEvent.type === 'right_heel_strike') {
      this._commitRight();
    }
  }

  /** ストライド確定: 生MIN→遊脚屈曲臨床値、生MAX→立脚伸展臨床値 に変換して記録 */
  _commitLeft() {
    if (this._leftRawMin !== null) {
      // 遊脚最大屈曲(臨床°) = 180 - 生MIN
      this._leftSwingPeaks.push(180 - this._leftRawMin);
    }
    if (this._leftRawMax !== null) {
      // 立脚最小屈曲(臨床°) = 180 - 生MAX（値が小さいほど伸展している）
      this._leftStanceMins.push(180 - this._leftRawMax);
    }
    this._leftRawMin = null;
    this._leftRawMax = null;
  }

  _commitRight() {
    if (this._rightRawMin !== null) {
      this._rightSwingPeaks.push(180 - this._rightRawMin);
    }
    if (this._rightRawMax !== null) {
      this._rightStanceMins.push(180 - this._rightRawMax);
    }
    this._rightRawMin = null;
    this._rightRawMax = null;
  }

  /**
   * 各ストライドピークの中央値（平均より外れ値に強い）を返す。
   * ストライドが1回も確定していない場合は null。
   */
  _median(arr) {
    if (arr.length === 0) return null;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /** 遊脚期最大屈曲の中央値（左）臨床° */
  get leftSwingPeakMedian()  { return this._median(this._leftSwingPeaks); }
  /** 遊脚期最大屈曲の中央値（右）臨床° */
  get rightSwingPeakMedian() { return this._median(this._rightSwingPeaks); }
  /** 立脚終期最小屈曲（最大伸展）の中央値（左）臨床° */
  get leftStanceMinMedian()  { return this._median(this._leftStanceMins); }
  /** 立脚終期最小屈曲（最大伸展）の中央値（右）臨床° */
  get rightStanceMinMedian() { return this._median(this._rightStanceMins); }

  /** 確定済みストライド数（左）*/
  get leftStrideCount()  { return this._leftSwingPeaks.length; }
  /** 確定済みストライド数（右）*/
  get rightStrideCount() { return this._rightSwingPeaks.length; }

  /** ピーク値サマリーを返す（ストライド未確定の場合は null）*/
  getSummary() {
    return {
      leftSwingPeakMedian:  this.leftSwingPeakMedian,
      leftStanceMinMedian:  this.leftStanceMinMedian,
      rightSwingPeakMedian: this.rightSwingPeakMedian,
      rightStanceMinMedian: this.rightStanceMinMedian,
      leftStrideCount:  this.leftStrideCount,
      rightStrideCount: this.rightStrideCount
    };
  }
}
