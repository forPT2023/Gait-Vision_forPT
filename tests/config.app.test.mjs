import test from 'node:test';
import assert from 'node:assert/strict';

import { APP_SEMVER, APP_VERSION_LABEL, buildSessionId } from '../src/config/app.js';

test('app version constants stay aligned', () => {
  assert.equal(APP_SEMVER, '3.10.5');
  assert.equal(APP_VERSION_LABEL, 'Gait VISION forPT v3.10.5');
});

test('buildSessionId composes a stable session identifier from patient and timestamp', () => {
  assert.equal(
    buildSessionId({ patientId: 'PT-0001', sessionTimestamp: Date.UTC(2026, 0, 2) }),
    'session-PT-0001-1767312000000'
  );
});
