import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyPatientValidationUI,
  applyPlaneModeUI,
  disableRecordButton,
  enableAnalysisExportButtons,
  formatPatientDisplay,
  setRecordButtonForActiveAnalysis,
  setRecordButtonForActiveRecording,
  setRecordButtonForCameraMode,
  setRecordButtonForVideoMode
} from '../src/ui/controls.js';

function createToggleRecorder() {
  return {
    calls: [],
    toggle(name, enabled) {
      this.calls.push([name, enabled]);
    }
  };
}

function createButton() {
  return {
    disabled: true,
    textContent: '',
    classList: {
      removed: [],
      added: [],
      remove(...names) {
        this.removed.push(...names);
      },
      add(...names) {
        this.added.push(...names);
      }
    }
  };
}

test('applyPatientValidationUI reflects a valid state', () => {
  const patientSubmitBtn = { disabled: true };
  const patientIdError = { textContent: '', style: { display: 'block' } };
  const patientIdInput = { style: { borderColor: '#000000' } };

  applyPatientValidationUI({
    patientSubmitBtn,
    patientIdError,
    patientIdInput,
    validation: { valid: true, error: null }
  });

  assert.equal(patientSubmitBtn.disabled, false);
  assert.equal(patientIdError.style.display, 'none');
  assert.equal(patientIdInput.style.borderColor, '#10b981');
});

test('applyPatientValidationUI reflects an invalid state', () => {
  const patientSubmitBtn = { disabled: false };
  const patientIdError = { textContent: '', style: { display: 'none' } };
  const patientIdInput = { style: { borderColor: '#000000' } };

  applyPatientValidationUI({
    patientSubmitBtn,
    patientIdError,
    patientIdInput,
    validation: { valid: false, error: 'bad id' }
  });

  assert.equal(patientSubmitBtn.disabled, true);
  assert.equal(patientIdError.textContent, 'bad id');
  assert.equal(patientIdError.style.display, 'block');
  assert.equal(patientIdInput.style.borderColor, '#ef4444');
});

test('formatPatientDisplay prefixes the patient id label', () => {
  assert.equal(formatPatientDisplay('PT-00001'), '対象者ID: PT-00001');
});

test('applyPlaneModeUI toggles button/chart classes for sagittal mode', () => {
  const frontalButton = { classList: createToggleRecorder() };
  const sagittalButton = { classList: createToggleRecorder() };
  const chartsContainer = { classList: createToggleRecorder() };

  applyPlaneModeUI({
    frontalButton,
    sagittalButton,
    chartsContainer,
    currentPlane: 'sagittal'
  });

  assert.deepEqual(frontalButton.classList.calls, [['btn-primary', false], ['btn-secondary', true]]);
  assert.deepEqual(sagittalButton.classList.calls, [['btn-primary', true], ['btn-secondary', false]]);
  assert.deepEqual(chartsContainer.classList.calls, [['plane-sagittal', true]]);
});

test('setRecordButtonForCameraMode enables camera recording state', () => {
  const button = createButton();

  setRecordButtonForCameraMode(button);

  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '⏺ 録画');
  assert.deepEqual(button.classList.removed, ['btn-primary', 'btn-secondary']);
  assert.deepEqual(button.classList.added, ['btn-danger']);
});

test('setRecordButtonForVideoMode enables start state by default', () => {
  const button = createButton();

  setRecordButtonForVideoMode(button);

  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '▶ 開始');
  assert.deepEqual(button.classList.removed, ['btn-danger', 'btn-secondary']);
  assert.deepEqual(button.classList.added, ['btn-primary']);
});

test('setRecordButtonForVideoMode can keep the button disabled', () => {
  const button = createButton();

  setRecordButtonForVideoMode(button, { disabled: true });

  assert.equal(button.disabled, true);
  assert.equal(button.textContent, '▶ 開始');
});

test('setRecordButtonForActiveRecording reflects stop state', () => {
  const button = createButton();

  setRecordButtonForActiveRecording(button);

  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '⏹ 停止');
  assert.deepEqual(button.classList.removed, ['btn-danger', 'btn-primary']);
  assert.deepEqual(button.classList.added, ['btn-secondary']);
});

test('setRecordButtonForActiveAnalysis reflects stop state with danger styling', () => {
  const button = createButton();

  setRecordButtonForActiveAnalysis(button);

  assert.equal(button.disabled, false);
  assert.equal(button.textContent, '⏹ 停止');
  assert.deepEqual(button.classList.removed, ['btn-primary', 'btn-secondary']);
  assert.deepEqual(button.classList.added, ['btn-danger']);
});

test('disableRecordButton disables the record button in idle state', () => {
  const button = createButton();

  disableRecordButton(button);

  assert.equal(button.disabled, true);
  assert.equal(button.textContent, '⏺ 録画');
  assert.deepEqual(button.classList.removed, ['btn-primary', 'btn-danger', 'btn-secondary']);
  assert.deepEqual(button.classList.added, ['btn-danger']);
});

test('enableAnalysisExportButtons enables csv and report buttons when data exists', () => {
  const csvButton = { disabled: true };
  const reportButton = { disabled: true };

  enableAnalysisExportButtons({
    csvButton,
    reportButton,
    hasAnalysisData: true
  });

  assert.equal(csvButton.disabled, false);
  assert.equal(reportButton.disabled, false);
});
