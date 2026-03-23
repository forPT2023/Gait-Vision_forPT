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

function formatRuleComment({ ruleId, message }) {
  return `[${ruleId}] ${message}`;
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

    if (summary.avgSymmetry < thresholds.symmetry.lowBelow) {
      addRuleComment(comments, commentRules.symmetryLow);
    } else if (summary.avgSymmetry > thresholds.symmetry.strongAbove) {
      addRuleComment(comments, commentRules.symmetryStrong);
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
    if (summary.kneeDiff > thresholds.kneeDiff.elevatedAbove) {
      addRuleComment(comments, commentRules.kneeDiffElevated);
    } else {
      addRuleComment(comments, commentRules.kneeDiffStable);
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
  }

  if (comments.length === 0) {
    addRuleComment(comments, commentRules.overall);
  }

  return comments;
}

export function createReportSummary({ analysisData, analysisPlane, currentPlane, patientId, stepCount, sessionTimestamp, captureMode = 'camera', totalProcessedFrames = analysisData.length, gaitEvents = [], appVersion = APP_VERSION_LABEL, sessionId }) {
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
    symmetry: countMetricValues(analysisData, 'symmetry') > 0,
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
    thresholds: REPORT_THRESHOLDS[reportPlane]
  };

  summary.qualitySummary = `capture=${summary.captureMode} | valid=${summary.validFrames}/${summary.totalProcessedFrames} (${(summary.validFrameRatio * 100).toFixed(1)}%) | missing=${(summary.missingLandmarkRatio * 100).toFixed(1)}% | gait-events=${summary.gaitEventDetected ? 'available' : 'not-detected'} | speed=${summary.speedPolicyLabel}`;
  summary.comments = buildComments(summary);
  return summary;
}
