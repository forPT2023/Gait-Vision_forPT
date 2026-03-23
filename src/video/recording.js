import { downloadBlobFile, formatCompactDate } from '../storage/export.js';

export function buildRecordingFilename({ patientId, mimeType, date = new Date() }) {
  const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
  return `gait_${patientId}_${formatCompactDate({ date })}.${extension}`;
}

export function buildAnalyzedVideoFilename({ patientId, mimeType, date = new Date() }) {
  const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
  return `gait_analyzed_${patientId}_${formatCompactDate({ date })}.${extension}`;
}

export function formatRecordingInfoText({ elapsedSeconds, pointCount }) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return `⏺ ${minutes}:${seconds.toString().padStart(2, '0')} | ${pointCount}点`;
}

export function buildRecordingMetadata({ recordedVideoBlob, recordingMimeType, patientId, date = new Date() }) {
  const sizeInMB = (recordedVideoBlob.size / (1024 * 1024)).toFixed(2);
  const isMP4 = recordingMimeType.includes('mp4');
  return {
    sizeInMB,
    formatText: isMP4 ? 'MP4 (推奨)' : 'WebM',
    filename: buildRecordingFilename({ patientId, mimeType: recordingMimeType, date })
  };
}

export function selectRecordingMimeType(MediaRecorderCtor = MediaRecorder) {
  const mp4Types = ['video/mp4', 'video/mp4;codecs=h264', 'video/mp4;codecs=avc1'];
  const preferredMp4 = mp4Types.find((type) => MediaRecorderCtor.isTypeSupported(type));
  if (preferredMp4) {
    return preferredMp4;
  }

  const vp9Type = 'video/webm;codecs=vp9';
  if (MediaRecorderCtor.isTypeSupported(vp9Type)) {
    return vp9Type;
  }

  return 'video/webm';
}

export function createCanvasRecordingSession({
  stream,
  MediaRecorderCtor = MediaRecorder,
  videoBitsPerSecond = 2500000
}) {
  const mimeType = selectRecordingMimeType(MediaRecorderCtor);
  return {
    mimeType,
    recorder: new MediaRecorderCtor(stream, {
      mimeType,
      videoBitsPerSecond
    })
  };
}

export function downloadBlob({
  blob,
  filename,
  URLRef = URL,
  documentRef = document,
  revokeDelayMs = 100
}) {
  downloadBlobFile({
    blob,
    filename,
    URLRef,
    documentRef,
    revokeDelayMs
  });
}

export function showSaveRecordingDialog({
  documentRef = document,
  metadata
}) {
  documentRef.getElementById('recording-size').textContent = `${metadata.sizeInMB} MB`;
  documentRef.getElementById('recording-format').textContent = metadata.formatText;
  documentRef.getElementById('recording-filename').textContent = metadata.filename;
  documentRef.getElementById('save-recording-modal')?.classList.add('show');
}

export function closeSaveRecordingDialog({ documentRef = document }) {
  documentRef.getElementById('save-recording-modal')?.classList.remove('show');
}

export function resetRecordedVideoState() {
  return {
    recordedVideoBlob: null,
    recordedChunks: []
  };
}
