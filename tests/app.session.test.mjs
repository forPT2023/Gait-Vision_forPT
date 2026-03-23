import test from 'node:test';
import assert from 'node:assert/strict';

import { buildSessionRecord } from '../src/app/session.js';

test('buildSessionRecord includes capture and quality metadata for persistence', () => {
  const record = buildSessionRecord({
    patientId: 'PT-0001',
    analysisPlane: 'frontal',
    captureMode: 'video',
    analysisData: [{ elapsedMs: 0 }, { elapsedMs: 1000 }],
    gaitEvents: [{ type: 'heel-strike', timestamp: 1000 }],
    stepCount: 6,
    analysisFrameCount: 5,
    sessionTimestamp: Date.UTC(2026, 0, 2),
    appVersion: 'test-version'
  });

  assert.equal(record.sessionId, 'session-PT-0001-1767312000000');
  assert.equal(record.captureMode, 'video');
  assert.equal(record.appVersion, 'test-version');
  assert.equal(record.totalProcessedFrames, 5);
  assert.equal(record.validFrames, 2);
  assert.equal(record.validFrameRatio, 0.4);
  assert.equal(record.missingLandmarkRatio, 0.6);
  assert.equal(record.eventDetectionAvailable, true);
  assert.equal(record.stepCount, 6);
});
