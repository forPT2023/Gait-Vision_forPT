import test from 'node:test';
import assert from 'node:assert/strict';

import { APP_SEMVER, APP_VERSION_LABEL, buildSessionId } from '../src/config/app.js';

test('app version constants stay aligned', () => {
  assert.equal(APP_SEMVER, '3.10.70');
  assert.equal(APP_VERSION_LABEL, 'Gait VISION forPT v3.10.70');
});

test('buildSessionId composes a stable session identifier from patient and timestamp', () => {
  // v3.10.62: 衝突防止のためモノトニックカウンター付きフォーマット
  // '-N' サフィックスが付くため正規表現で検証する
  const id = buildSessionId({ patientId: 'PT-0001', sessionTimestamp: Date.UTC(2026, 0, 2) });
  assert.match(id, /^session-PT-0001-1767312000000-\d+$/);
});

test('buildSessionId generates unique IDs when called at the same millisecond', () => {
  const ts = Date.UTC(2026, 0, 2);
  const id1 = buildSessionId({ patientId: 'P1', sessionTimestamp: ts });
  const id2 = buildSessionId({ patientId: 'P1', sessionTimestamp: ts });
  assert.notEqual(id1, id2);
});
