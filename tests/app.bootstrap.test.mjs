import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStoredPatientIdState,
  getStoredPatientId,
  hasStoredConsent,
  persistConsent,
  persistPatientId
} from '../src/app/bootstrap.js';

test('hasStoredConsent reads the persisted consent flag', () => {
  const storage = {
    getItem(key) {
      return key === 'hasConsented' ? 'true' : null;
    }
  };
  assert.equal(hasStoredConsent({ localStorageRef: storage }), true);
});

test('persistConsent and persistPatientId write expected keys', () => {
  const writes = [];
  const storage = {
    setItem(key, value) {
      writes.push([key, value]);
    }
  };

  persistConsent({ localStorageRef: storage });
  persistPatientId({ localStorageRef: storage, patientId: 'PT-0099' });

  assert.deepEqual(writes, [
    ['hasConsented', 'true'],
    ['lastPatientId', 'PT-0099']
  ]);
});

test('buildStoredPatientIdState restores patient id and validation-driven button state', () => {
  const storage = {
    getItem(key) {
      return key === 'lastPatientId' ? 'PT-0001' : null;
    }
  };

  assert.equal(getStoredPatientId({ localStorageRef: storage }), 'PT-0001');
  assert.deepEqual(
    buildStoredPatientIdState({
      localStorageRef: storage,
      validatePatientId: () => ({ valid: true })
    }),
    { value: 'PT-0001', submitDisabled: false }
  );
});
