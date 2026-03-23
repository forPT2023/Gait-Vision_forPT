export const APP_SEMVER = '3.10.3';
export const APP_VERSION_LABEL = `Gait VISION forPT v${APP_SEMVER}`;

export function buildSessionId({ patientId = 'unknown', sessionTimestamp, prefix = 'session' } = {}) {
  const safePatientId = String(patientId || 'unknown').trim() || 'unknown';
  const safeTimestamp = sessionTimestamp instanceof Date
    ? sessionTimestamp.getTime()
    : Number.isFinite(sessionTimestamp)
      ? sessionTimestamp
      : Date.now();

  return `${prefix}-${safePatientId}-${safeTimestamp}`;
}
