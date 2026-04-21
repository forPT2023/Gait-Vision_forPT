export const APP_SEMVER = '3.10.65';
export const APP_VERSION_LABEL = `Gait VISION forPT v${APP_SEMVER}`; // Bug#8 speed EMA worldLandmarks guard

// 同一ミリ秒内に複数回生成されたときの衝突を防ぐためのモノトニックカウンター。
// モジュールスコープで保持するため、同一ページセッション中はリセットされない。
let _sessionIdCounter = 0;

export function buildSessionId({ patientId = 'unknown', sessionTimestamp, prefix = 'session' } = {}) {
  const safePatientId = String(patientId || 'unknown').trim() || 'unknown';
  const safeTimestamp = sessionTimestamp instanceof Date
    ? sessionTimestamp.getTime()
    : Number.isFinite(sessionTimestamp)
      ? sessionTimestamp
      : Date.now();

  // 同一ミリ秒内の衝突を防ぐためカウンターを付与する。
  // 例: 'session-P1-1767261600000-0', 'session-P1-1767261600000-1'
  const counter = _sessionIdCounter++;
  return `${prefix}-${safePatientId}-${safeTimestamp}-${counter}`;
}
