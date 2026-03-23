export function calculateCadenceFromEvents({
  gaitEvents,
  mpTimestamp,
  timeWindowMs = 10000,
  minCadence = 60,
  maxCadence = 200
}) {
  const recentEvents = gaitEvents.filter((event) => (mpTimestamp - event.timestamp) < timeWindowMs);

  let cadence = 0;
  if (recentEvents.length >= 2) {
    cadence = (recentEvents.length / (timeWindowMs / 1000)) * 60;
  } else if (recentEvents.length === 1 && gaitEvents.length >= 2) {
    const lastTwo = gaitEvents.slice(-2);
    const timeBetweenSteps = lastTwo[1].timestamp - lastTwo[0].timestamp;
    if (timeBetweenSteps > 0 && timeBetweenSteps < 2000) {
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
  return {
    timestamp: elapsedMs,
    recordedAt: analysisStartEpochMs + elapsedMs,
    elapsedMs,
    mpTimestamp,
    landmarks,
    worldLandmarks,
    angles,
    speed: clampMetric(emaValues.speed, 0, Number.POSITIVE_INFINITY),
    cadence: clampMetric(emaValues.cadence, 0, 200),
    symmetry: clampMetric(kneeSymmetry, 0, 100, 100),
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
