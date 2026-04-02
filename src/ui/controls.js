export function applyPatientValidationUI({
  patientSubmitBtn,
  patientIdError,
  patientIdInput,
  validation
}) {
  if (validation.valid) {
    patientSubmitBtn.disabled = false;
    patientIdError.style.display = 'none';
    patientIdInput.style.borderColor = '#10b981';
    return;
  }

  patientSubmitBtn.disabled = true;
  patientIdError.textContent = validation.error;
  patientIdError.style.display = validation.error ? 'block' : 'none';
  patientIdInput.style.borderColor = validation.error ? '#ef4444' : '#475569';
}

export function formatPatientDisplay(patientId) {
  return `対象者ID: ${patientId}`;
}

export function applyPlaneModeUI({
  frontalButton,
  sagittalButton,
  chartsContainer,
  currentPlane
}) {
  const isSagittal = currentPlane === 'sagittal';

  frontalButton.classList.toggle('btn-primary', !isSagittal);
  frontalButton.classList.toggle('btn-secondary', isSagittal);
  sagittalButton.classList.toggle('btn-primary', isSagittal);
  sagittalButton.classList.toggle('btn-secondary', !isSagittal);
  chartsContainer.classList.toggle('plane-sagittal', isSagittal);
}

export function setRecordButtonForCameraMode(recordButton) {
  recordButton.disabled = false;
  recordButton.textContent = '⏺ 録画';
  recordButton.classList.remove('btn-primary', 'btn-secondary');
  recordButton.classList.add('btn-danger');
}

export function setRecordButtonForVideoMode(recordButton, { disabled = false } = {}) {
  recordButton.disabled = disabled;
  recordButton.textContent = '▶ 開始';
  recordButton.classList.remove('btn-danger', 'btn-secondary');
  recordButton.classList.add('btn-primary');
}

export function setRecordButtonForActiveRecording(recordButton) {
  recordButton.disabled = false;
  recordButton.textContent = '⏹ 停止';
  recordButton.classList.remove('btn-danger', 'btn-primary');
  recordButton.classList.add('btn-secondary');
}

export function setRecordButtonForActiveAnalysis(recordButton) {
  recordButton.disabled = false;
  recordButton.textContent = '⏹ 停止';
  recordButton.classList.remove('btn-primary', 'btn-secondary');
  recordButton.classList.add('btn-danger');
}

export function disableRecordButton(recordButton) {
  recordButton.disabled = true;
  recordButton.textContent = '⏺ 録画';
  recordButton.classList.remove('btn-primary', 'btn-danger', 'btn-secondary');
  recordButton.classList.add('btn-danger');
}

export function enableAnalysisExportButtons({
  csvButton,
  reportButton,
  analyzedVideoButton = null,
  hasAnalysisData,
  hasVideoSource = false
}) {
  if (!hasAnalysisData) return;
  csvButton.disabled = false;
  reportButton.disabled = false;
  // 解析動画ボタンはビデオファイルモードかつ解析データがある場合のみ有効化する
  if (analyzedVideoButton && hasVideoSource) {
    analyzedVideoButton.disabled = false;
  }
}
