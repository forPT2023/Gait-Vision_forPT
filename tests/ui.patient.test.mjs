import test from 'node:test';
import assert from 'node:assert/strict';

import { validatePatientId } from '../src/ui/patient.js';

test('validatePatientId rejects empty values and Japanese names', () => {
  assert.deepEqual(validatePatientId('   '), {
    valid: false,
    error: '対象者IDを入力してください'
  });
  assert.equal(validatePatientId('山田太郎').valid, false);
});

test('validatePatientId rejects phone, email, and URL-like identifiers', () => {
  assert.equal(validatePatientId('090-1234-5678').valid, false);
  assert.equal(validatePatientId('pt@example.com').valid, false);
  assert.equal(validatePatientId('https://example.com').valid, false);
});

test('validatePatientId accepts anonymized codes', () => {
  assert.deepEqual(validatePatientId(' PT-00001 '), {
    valid: true,
    error: null
  });
});
