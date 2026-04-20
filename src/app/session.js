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
  speedPolicyLabel = 'estimated',
  // Bug#7修正: 呼び出し元から共通セッションIDを受け取る。
  // 未指定の場合は従来通り buildSessionId() で生成（後方互換性維持）。
  sessionId: providedSessionId
}) {
  const validFrames = analysisData.length;
  const totalProcessedFrames = Math.max(validFrames, analysisFrameCount || 0);
  const validFrameRatio = totalProcessedFrames > 0 ? validFrames / totalProcessedFrames : 0;
  const missingLandmarkRatio = totalProcessedFrames > 0 ? (totalProcessedFrames - validFrames) / totalProcessedFrames : 0;
  const eventDetectionAvailable = gaitEvents.length > 0;
  const resolvedSessionId = providedSessionId || buildSessionId({ patientId, sessionTimestamp });

  return {
    sessionId: resolvedSessionId,
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
