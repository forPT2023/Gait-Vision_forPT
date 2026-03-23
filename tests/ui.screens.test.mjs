import test from 'node:test';
import assert from 'node:assert/strict';

import { restoreScreenState, showMainApp, showPatientScreen } from '../src/ui/screens.js';

function createClassRecorder() {
  return {
    added: [],
    removed: [],
    add(value) { this.added.push(value); },
    remove(value) { this.removed.push(value); }
  };
}

test('showPatientScreen hides consent and shows patient screen', () => {
  const consent = { classList: createClassRecorder() };
  const patient = { classList: createClassRecorder() };

  showPatientScreen({
    documentRef: {
      getElementById(id) {
        if (id === 'consent-screen') return consent;
        if (id === 'patient-screen') return patient;
        return null;
      }
    }
  });

  assert.deepEqual(consent.classList.added, ['hidden']);
  assert.deepEqual(patient.classList.removed, ['hidden']);
});

test('showMainApp hides patient screen, shows main app, and colors fps display', () => {
  const patient = { classList: createClassRecorder() };
  const mainApp = { classList: createClassRecorder() };
  const fpsDisplay = { style: { color: '' } };

  showMainApp({
    documentRef: {
      getElementById(id) {
        if (id === 'patient-screen') return patient;
        if (id === 'main-app') return mainApp;
        return null;
      }
    },
    fpsDisplay
  });

  assert.deepEqual(patient.classList.added, ['hidden']);
  assert.deepEqual(mainApp.classList.removed, ['hidden']);
  assert.equal(fpsDisplay.style.color, '#10b981');
});

test('restoreScreenState only applies the patient screen when consent exists', () => {
  const consent = { classList: createClassRecorder() };
  const patient = { classList: createClassRecorder() };
  const documentRef = {
    getElementById(id) {
      if (id === 'consent-screen') return consent;
      if (id === 'patient-screen') return patient;
      return null;
    }
  };

  restoreScreenState({ documentRef, hasConsented: false });
  assert.deepEqual(consent.classList.added, []);

  restoreScreenState({ documentRef, hasConsented: true });
  assert.deepEqual(consent.classList.added, ['hidden']);
  assert.deepEqual(patient.classList.removed, ['hidden']);
});
