import { APP_VERSION_LABEL } from '../config/app.js';

const ANALYSIS_CSV_HEADER = 'elapsed_ms,speed_m_s,cadence_spm,symmetry_pct,trunk_deg,pelvis_deg,left_knee_deg,right_knee_deg,left_hip_deg,right_hip_deg,left_ankle_deg,right_ankle_deg';

function formatAnalysisCsvRow(dataPoint) {
  return [
    Math.round(dataPoint.elapsedMs ?? dataPoint.timestamp ?? 0),
    dataPoint.speed.toFixed(3),
    dataPoint.cadence.toFixed(1),
    dataPoint.symmetry.toFixed(1),
    dataPoint.trunk.toFixed(2),
    dataPoint.pelvis.toFixed(2),
    dataPoint.leftKnee.toFixed(2),
    dataPoint.rightKnee.toFixed(2),
    dataPoint.leftHip.toFixed(2),
    dataPoint.rightHip.toFixed(2),
    dataPoint.leftAnkle.toFixed(2),
    dataPoint.rightAnkle.toFixed(2)
  ].join(',');
}

export function buildSessionExport({
  sessions,
  exportDate = new Date().toISOString(),
  version = APP_VERSION_LABEL
}) {
  return {
    exportDate,
    version,
    totalSessions: sessions.length,
    sessions
  };
}

export function formatCompactDate({ date = new Date() } = {}) {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

export function createBackupFilename({ date = new Date() } = {}) {
  return `gait_backup_${formatCompactDate({ date })}.json`;
}

export function buildCsvExportFilename({ patientId, date = new Date() }) {
  return `gait_${patientId}_${formatCompactDate({ date })}.csv`;
}

export function buildPdfReportFilename({ patientId, date = new Date() }) {
  return `gait_report_${patientId}_${formatCompactDate({ date })}.pdf`;
}

export function buildAnalysisCsv(analysisData, { bom = '\uFEFF' } = {}) {
  const rows = analysisData.map(formatAnalysisCsvRow);
  return `${bom}${ANALYSIS_CSV_HEADER}\n${rows.join('\n')}${rows.length ? '\n' : ''}`;
}

export function downloadBlobFile({
  blob,
  filename,
  URLRef = URL,
  documentRef = document,
  revokeDelayMs = 0
}) {
  const url = URLRef.createObjectURL(blob);
  const link = documentRef.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URLRef.revokeObjectURL(url), revokeDelayMs);
}

export function downloadJson({
  documentRef = document,
  URLRef = URL,
  payload,
  filename
}) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlobFile({
    blob,
    filename,
    URLRef,
    documentRef
  });
}
