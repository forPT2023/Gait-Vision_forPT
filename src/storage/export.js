import { APP_VERSION_LABEL } from '../config/app.js';

const ANALYSIS_CSV_HEADER = 'elapsed_ms,speed_m_s,cadence_spm,symmetry_pct,trunk_deg,pelvis_deg,left_knee_deg,right_knee_deg,left_hip_deg,right_hip_deg,left_ankle_deg,right_ankle_deg';

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatFixed(value, digits) {
  return toFiniteNumber(value).toFixed(digits);
}

function sanitizeFilenameSegment(value, { fallback = 'unknown' } = {}) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return fallback;
  const sanitized = normalized
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+|\.+$/g, '');
  return sanitized || fallback;
}

function formatAnalysisCsvRow(dataPoint = {}) {
  return [
    Math.round(toFiniteNumber(dataPoint.elapsedMs ?? dataPoint.timestamp ?? 0)),
    formatFixed(dataPoint.speed, 3),
    formatFixed(dataPoint.cadence, 1),
    formatFixed(dataPoint.symmetry, 1),
    formatFixed(dataPoint.trunk, 2),
    formatFixed(dataPoint.pelvis, 2),
    formatFixed(dataPoint.leftKnee, 2),
    formatFixed(dataPoint.rightKnee, 2),
    formatFixed(dataPoint.leftHip, 2),
    formatFixed(dataPoint.rightHip, 2),
    formatFixed(dataPoint.leftAnkle, 2),
    formatFixed(dataPoint.rightAnkle, 2)
  ].join(',');
}

export function buildSessionExport({
  sessions = [],
  exportDate = new Date().toISOString(),
  version = APP_VERSION_LABEL
}) {
  const normalizedSessions = Array.isArray(sessions) ? sessions : [];
  return {
    exportDate,
    version,
    totalSessions: normalizedSessions.length,
    sessions: normalizedSessions
  };
}

export function formatCompactDate({ date = new Date() } = {}) {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

export function createBackupFilename({ date = new Date() } = {}) {
  return `gait_backup_${formatCompactDate({ date })}.json`;
}

export function buildCsvExportFilename({ patientId, date = new Date() }) {
  return `gait_${sanitizeFilenameSegment(patientId)}_${formatCompactDate({ date })}.csv`;
}

export function buildPdfReportFilename({ patientId, date = new Date() }) {
  return `gait_report_${sanitizeFilenameSegment(patientId)}_${formatCompactDate({ date })}.pdf`;
}

export function buildAnalysisCsv(analysisData, { bom = '\uFEFF' } = {}) {
  const rows = Array.isArray(analysisData)
    ? analysisData.map(formatAnalysisCsvRow)
    : [];
  return `${bom}${ANALYSIS_CSV_HEADER}\n${rows.join('\n')}${rows.length ? '\n' : ''}`;
}

export function downloadBlobFile({
  blob,
  filename,
  URLRef = globalThis.URL,
  documentRef = globalThis.document,
  revokeDelayMs = 0
}) {
  if (!URLRef?.createObjectURL || !URLRef?.revokeObjectURL) {
    throw new Error('URL API is unavailable');
  }
  if (!documentRef?.createElement) {
    throw new Error('Document API is unavailable');
  }
  if (blob == null) {
    throw new Error('Blob payload is required');
  }
  const normalizedFilename = String(filename ?? '').trim();
  if (!normalizedFilename) {
    throw new Error('Filename is required');
  }
  const url = URLRef.createObjectURL(blob);
  const link = documentRef.createElement('a');
  link.href = url;
  link.download = normalizedFilename;
  let appended = false;
  let cleanupParent = null;
  if (!link.isConnected && documentRef.body?.appendChild) {
    documentRef.body.appendChild(link);
    appended = true;
    cleanupParent = documentRef.body;
  }
  try {
    link.click();
  } finally {
    if (appended && cleanupParent?.removeChild) {
      cleanupParent.removeChild(link);
    } else if (appended && link.parentNode?.removeChild) {
      link.parentNode.removeChild(link);
    }
    setTimeout(() => URLRef.revokeObjectURL(url), revokeDelayMs);
  }
}

export function downloadJson({
  documentRef = globalThis.document,
  URLRef = globalThis.URL,
  BlobRef = globalThis.Blob,
  payload,
  filename = 'export.json'
}) {
  if (typeof BlobRef !== 'function') {
    throw new Error('Blob API is unavailable');
  }
  const blob = new BlobRef([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlobFile({
    blob,
    filename,
    URLRef,
    documentRef
  });
}
