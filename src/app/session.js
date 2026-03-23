import { APP_VERSION_LABEL, buildSessionId } from '../config/app.js';

export function buildSessionRecord({
  patientId,
  analysisPlane,
  captureMode,
  analysisData,
  gaitEvents,
  stepCount,
  analysisFrameCount,
  sessionTimestamp = Date.now(),
  appVersion = APP_VERSION_LABEL,
  speedPolicyLabel = 'estimated'
}) {
  const validFrames = analysisData.length;
  const totalProcessedFrames = Math.max(validFrames, analysisFrameCount || 0);
  const validFrameRatio = totalProcessedFrames > 0 ? validFrames / totalProcessedFrames : 0;
  const missingLandmarkRatio = totalProcessedFrames > 0 ? (totalProcessedFrames - validFrames) / totalProcessedFrames : 0;
  const eventDetectionAvailable = gaitEvents.length > 0;

  return {
    sessionId: buildSessionId({ patientId, sessionTimestamp }),
    patientId,
    plane: analysisPlane,
    captureMode,
    timestamp: sessionTimestamp,
    appVersion,
    speedPolicyLabel,
    totalProcessedFrames,
    validFrames,
    validFrameRatio,
    missingLandmarkRatio,
    eventDetectionAvailable,
    data: analysisData,
    gaitEvents,
    stepCount
  };
}
