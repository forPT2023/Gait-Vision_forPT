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

export function formatCompactDate({ date = new Date() } = {}) {
  return date.toISOString().split('T')[0].replace(/-/g, '');
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

/**
 * デバイスに応じた最適な方法でファイルを保存する。
 *
 * - iOS Safari: <a download> が無視される。Web Share API 経由で「ファイルに保存」等を案内。
 * - Android/Desktop: まず <a download>.click() で直接ダウンロード。
 *   Web Share API があっても強制的に共有シートには飛ばさない（UX 上不便なため）。
 *
 * @param {object} params
 * @param {Blob}     params.blob
 * @param {string}   params.filename
 * @param {boolean}  [params.forceShare=false]  - true のときのみ iOS 以外でも共有シートを使う
 * @param {URL}      [params.URLRef]
 * @param {Document} [params.documentRef]
 * @param {Navigator} [params.navigatorRef]
 * @param {number}   [params.revokeDelayMs]
 * @returns {Promise<'shared'|'downloaded'>}
 */
export async function shareOrDownloadBlob({
  blob,
  filename,
  forceShare = false,
  URLRef = globalThis.URL,
  documentRef = globalThis.document,
  navigatorRef = globalThis.navigator,
  revokeDelayMs = 0
}) {
  if (blob == null) throw new Error('Blob payload is required');
  const normalizedFilename = String(filename ?? '').trim();
  if (!normalizedFilename) throw new Error('Filename is required');

  // iOS Safari 判定: <a download> がほぼ機能しないため Web Share API を使う
  const ua = (navigatorRef?.userAgent ?? '');
  const isIOS = /iPad|iPhone|iPod/.test(ua) ||
    ((navigatorRef?.platform ?? '') === 'MacIntel' && (navigatorRef?.maxTouchPoints ?? 0) > 1);

  const canUseShare =
    typeof navigatorRef?.canShare === 'function' &&
    typeof navigatorRef?.share === 'function';

  // iOS: Web Share API を優先（<a download> が機能しないため）
  // その他: forceShare=true のときのみ共有シートを使う（通常はダウンロード）
  if (canUseShare && (isIOS || forceShare)) {
    const file = new File([blob], normalizedFilename, { type: blob.type || 'application/octet-stream' });
    if (navigatorRef.canShare({ files: [file] })) {
      await navigatorRef.share({ files: [file], title: normalizedFilename });
      return 'shared';
    }
  }

  // 通常のダウンロード（Android / Desktop / iOS でShare失敗した場合）
  downloadBlobFile({ blob, filename: normalizedFilename, URLRef, documentRef, revokeDelayMs });
  return 'downloaded';
}
