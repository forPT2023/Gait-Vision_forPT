import { APP_VERSION_LABEL, buildSessionId } from '../config/app.js';
import { REPORT_COMMENT_RULES, REPORT_THRESHOLDS } from '../config/report.js';

function countMetricValues(data, key, { excludeZero = false } = {}) {
  return data
    .map((item) => item[key])
    .filter((value) => typeof value === 'number' && Number.isFinite(value) && (!excludeZero || value > 0))
    .length;
}

export function averageMetric(data, key, { excludeZero = false } = {}) {
  const values = data
    .map((item) => item[key])
    .filter((value) => typeof value === 'number' && Number.isFinite(value) && (!excludeZero || value > 0));

  const fallbackValues = values.length > 0
    ? values
    : data
        .map((item) => item[key])
        .filter((value) => typeof value === 'number' && Number.isFinite(value));

  if (fallbackValues.length === 0) return 0;
  return fallbackValues.reduce((sum, value) => sum + value, 0) / fallbackValues.length;
}

export function evaluateMetricStatus(value, { normalMin, normalMax }) {
  if (value >= normalMin && value <= normalMax) {
    return { tone: 'good', label: '🟢 正常' };
  }
  if (value < normalMin - 10 || value > normalMax + 10) {
    return { tone: 'alert', label: '🔴 要注意' };
  }
  return { tone: 'warn', label: '🟡 やや逸脱' };
}

export function evaluateDifferenceStatus(diff, threshold = 10) {
  if (diff <= threshold) {
    return { tone: 'good', label: '🟢 良好' };
  }
  if (diff <= threshold * 2) {
    return { tone: 'warn', label: '🟡 やや差あり' };
  }
  return { tone: 'alert', label: '🔴 左右差大' };
}

function formatRuleComment({ message }) {
  return message;
}

function addRuleComment(comments, rule) {
  comments.push(formatRuleComment(rule));
}

function buildComments(summary) {
  const comments = [];
  const thresholds = REPORT_THRESHOLDS[summary.reportPlane];
  const commentRules = REPORT_COMMENT_RULES[summary.reportPlane];

  if (summary.reportPlane === 'frontal') {
    if (summary.avgSpeed < thresholds.speed.slowBelow) {
      addRuleComment(comments, commentRules.speedSlow);
    } else if (summary.avgSpeed > thresholds.speed.strongAbove) {
      addRuleComment(comments, commentRules.speedStrong);
    }

    // 対称性コメントは歩行イベント検出時のみ（未検出時は信頼できないため除外）
    if (summary.metricAvailability.symmetry) {
      if (summary.avgSymmetry < thresholds.symmetry.lowBelow) {
        addRuleComment(comments, commentRules.symmetryLow);
      } else if (summary.avgSymmetry > thresholds.symmetry.strongAbove) {
        addRuleComment(comments, commentRules.symmetryStrong);
      }
    }

    if (summary.avgTrunk > thresholds.trunk.elevatedAbove) {
      addRuleComment(comments, commentRules.trunkElevated);
    }

    if (summary.avgCadence < thresholds.cadence.lowBelow) {
      addRuleComment(comments, commentRules.cadenceLow);
    } else if (summary.avgCadence > thresholds.cadence.strongAbove) {
      addRuleComment(comments, commentRules.cadenceStrong);
    }
  } else {
    // ─── 膝関節ピーク値コメント（KneePeakTracker が有効な場合のみ）──────────
    const kp = summary.kneePeaks;
    if (kp && (kp.leftStrideCount >= 2 || kp.rightStrideCount >= 2)) {
      // 遊脚期最大屈曲ピーク（中央値）の評価
      const leftPeak  = kp.leftSwingPeakMedian;
      const rightPeak = kp.rightSwingPeakMedian;
      const bothPeakAvail = leftPeak !== null && rightPeak !== null;
      const anyPeakLow = (leftPeak !== null && leftPeak < thresholds.kneeSwingPeak.lowBelow) ||
                         (rightPeak !== null && rightPeak < thresholds.kneeSwingPeak.lowBelow);
      if (anyPeakLow) {
        addRuleComment(comments, commentRules.kneeSwingPeakLow);
      }
      // 遊脚期ピーク左右差
      if (bothPeakAvail && Math.abs(leftPeak - rightPeak) > thresholds.kneeSwingPeakDiff.elevatedAbove) {
        addRuleComment(comments, commentRules.kneeSwingPeakDiffElevated);
      }
      // 立脚終期伸展不足（最小角度が大きすぎる）
      const leftExt  = kp.leftStanceMinMedian;
      const rightExt = kp.rightStanceMinMedian;
      const extElevated = (leftExt !== null && leftExt > thresholds.kneeStanceExt.elevatedAbove) ||
                          (rightExt !== null && rightExt > thresholds.kneeStanceExt.elevatedAbove);
      if (extElevated) {
        addRuleComment(comments, commentRules.kneeStanceExtElevated);
      }
    } else {
      // ピーク値未確定時は平均値ベースのコメント
      if (summary.kneeDiff > thresholds.kneeDiff.elevatedAbove) {
        addRuleComment(comments, commentRules.kneeDiffElevated);
      } else {
        addRuleComment(comments, commentRules.kneeDiffStable);
      }
    }

    if (summary.hipDiff > thresholds.hipDiff.elevatedAbove) {
      addRuleComment(comments, commentRules.hipDiffElevated);
    }

    if (summary.ankleDiff > thresholds.ankleDiff.elevatedAbove) {
      addRuleComment(comments, commentRules.ankleDiffElevated);
    }

    if (summary.avgPelvis > thresholds.pelvis.elevatedAbove) {
      addRuleComment(comments, commentRules.pelvisElevated);
    }

    // 矢状面でもケイデンスは比較的信頼性があるためコメントを出す
    if (summary.avgCadence > 0) {
      if (summary.avgCadence < thresholds.cadence.lowBelow) {
        addRuleComment(comments, commentRules.cadenceLow);
      } else if (summary.avgCadence > thresholds.cadence.strongAbove) {
        addRuleComment(comments, commentRules.cadenceStrong);
      }
    }

    // 歩行速度（矢状面では参考値として低速時のみ警告）
    if (summary.avgSpeed > 0 && summary.avgSpeed < thresholds.speed.slowBelow) {
      addRuleComment(comments, commentRules.speedSlow);
    }
  }

  if (comments.length === 0) {
    addRuleComment(comments, commentRules.overall);
  }

  return comments;
}

export function createReportSummary({ analysisData, analysisPlane, currentPlane, patientId, stepCount, sessionTimestamp, captureMode = 'camera', totalProcessedFrames = analysisData.length, gaitEvents = [], appVersion = APP_VERSION_LABEL, sessionId, kneePeaks = null }) {
  const reportPlane = analysisPlane || currentPlane;
  const avgSpeed = averageMetric(analysisData, 'speed', { excludeZero: true });
  const avgCadence = averageMetric(analysisData, 'cadence', { excludeZero: true });
  const avgSymmetry = averageMetric(analysisData, 'symmetry');
  const avgTrunk = averageMetric(analysisData, 'trunk');
  const avgLeftKnee = averageMetric(analysisData, 'leftKnee', { excludeZero: true });
  const avgRightKnee = averageMetric(analysisData, 'rightKnee', { excludeZero: true });
  const avgLeftHip = averageMetric(analysisData, 'leftHip', { excludeZero: true });
  const avgRightHip = averageMetric(analysisData, 'rightHip', { excludeZero: true });
  const avgPelvis = averageMetric(analysisData, 'pelvis');
  const avgLeftAnkle = averageMetric(analysisData, 'leftAnkle', { excludeZero: true });
  const avgRightAnkle = averageMetric(analysisData, 'rightAnkle', { excludeZero: true });
  const metricAvailability = {
    speed: countMetricValues(analysisData, 'speed', { excludeZero: true }) > 0,
    cadence: countMetricValues(analysisData, 'cadence', { excludeZero: true }) > 0,
    // 対称性は歩行イベントが検出されたときのみ「有効」とみなす
    symmetry: gaitEvents.length > 0 && countMetricValues(analysisData, 'symmetry') > 0,
    trunk: countMetricValues(analysisData, 'trunk') > 0,
    leftKnee: countMetricValues(analysisData, 'leftKnee', { excludeZero: true }) > 0,
    rightKnee: countMetricValues(analysisData, 'rightKnee', { excludeZero: true }) > 0,
    leftHip: countMetricValues(analysisData, 'leftHip', { excludeZero: true }) > 0,
    rightHip: countMetricValues(analysisData, 'rightHip', { excludeZero: true }) > 0,
    pelvis: countMetricValues(analysisData, 'pelvis') > 0,
    leftAnkle: countMetricValues(analysisData, 'leftAnkle', { excludeZero: true }) > 0,
    rightAnkle: countMetricValues(analysisData, 'rightAnkle', { excludeZero: true }) > 0
  };
  const durationMs = analysisData.length > 0
    ? Math.max(...analysisData.map((item) => item.elapsedMs ?? item.timestamp ?? 0))
    : 0;
  const validFrames = analysisData.length;
  const safeTotalProcessedFrames = Math.max(validFrames, totalProcessedFrames || 0);
  const validFrameRatio = safeTotalProcessedFrames > 0 ? validFrames / safeTotalProcessedFrames : 0;
  const missingLandmarkRatio = safeTotalProcessedFrames > 0 ? (safeTotalProcessedFrames - validFrames) / safeTotalProcessedFrames : 0;

  const kneeDiff = Math.abs(avgLeftKnee - avgRightKnee);
  const hipDiff = Math.abs(avgLeftHip - avgRightHip);
  const ankleDiff = Math.abs(avgLeftAnkle - avgRightAnkle);
  const sessionDate = new Date(sessionTimestamp || Date.now());
  const resolvedSessionId = sessionId || buildSessionId({ patientId, sessionTimestamp: sessionDate });

  const summary = {
    patientId,
    sessionId: resolvedSessionId,
    appVersion,
    reportPlane,
    captureMode,
    stepCount,
    sessionTimestamp: sessionDate,
    sessionDateLabel: sessionDate.toLocaleDateString('ja-JP'),
    durationMs,
    dataPoints: analysisData.length,
    validFrames,
    totalProcessedFrames: safeTotalProcessedFrames,
    validFrameRatio,
    missingLandmarkRatio,
    gaitEventDetected: gaitEvents.length > 0,
    speedPolicyLabel: 'estimated',
    metricAvailability,
    avgSpeed,
    avgCadence,
    avgSymmetry,
    avgTrunk,
    avgLeftKnee,
    avgRightKnee,
    avgLeftHip,
    avgRightHip,
    avgPelvis,
    avgLeftAnkle,
    avgRightAnkle,
    kneeDiff,
    hipDiff,
    ankleDiff,
    thresholds: REPORT_THRESHOLDS[reportPlane],
    // ── 膝関節ピーク値（KneePeakTracker より）──────────────────────────────
    // kneePeaks は矢状面解析時のみ有効。ヒールストライクが1回以上検出された
    // ストライドの中央値を使用。null の場合はピーク値未確定。
    kneePeaks: kneePeaks || null,
    // ── 股関節角度の計測方法注記 ────────────────────────────────────────────
    // 現実装の股関節角度は「肩-股関節-膝」の3D角度であり、純粋な股関節
    // 屈伸角度（骨盤-大腿骨）ではない。体幹前傾の影響を受けるため、
    // 絶対値の臨床解釈には注意が必要。左右差（hipDiff）は相対比較として
    // 一定の有用性を持つ。
    hipAngleNote: 'trunk-thigh-angle'  // 'trunk-thigh-angle' = 肩-股-膝の角度（参考値）
  };

  const captureModeLabel = summary.captureMode === 'video' ? '動画ファイル' : 'カメラ';
  const validPct = (summary.validFrameRatio * 100).toFixed(1);
  const missingPct = (summary.missingLandmarkRatio * 100).toFixed(1);
  const gaitLabel = summary.gaitEventDetected ? '検出あり' : '未検出';
  summary.qualitySummary = `取得: ${captureModeLabel} | 有効フレーム: ${summary.validFrames}/${summary.totalProcessedFrames} (${validPct}%) | 姿勢検出失敗: ${missingPct}% | 歩行イベント: ${gaitLabel}`;
  summary.comments = buildComments(summary);
  return summary;
}
