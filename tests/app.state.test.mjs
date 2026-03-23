import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialAnalysisState, createStartedAnalysisState } from '../src/app/state.js';

test('createInitialAnalysisState returns a clean analysis session state', () => {
  const state = createInitialAnalysisState({
    createInitialEmaValues: () => ({ trunk: 0, pelvis: 0 })
  });

  assert.deepEqual(state, {
    analysisStartEpochMs: null,
    analysisStartMpTimestamp: null,
    analysisData: [],
    prevLandmarks: null,
    prevWorldLandmarks: null,
    prevTimestamp: null,
    gaitEvents: [],
    stepCount: 0,
    analysisFrameCount: 0,
    lastHeelStrikeTime: 0,
    emaValues: { trunk: 0, pelvis: 0 }
  });
});

test('createStartedAnalysisState stamps the start epoch while keeping clean session fields', () => {
  const state = createStartedAnalysisState({
    createInitialEmaValues: () => ({ trunk: 1 }),
    now: () => 123456789
  });

  assert.equal(state.analysisStartEpochMs, 123456789);
  assert.equal(state.analysisStartMpTimestamp, null);
  assert.deepEqual(state.analysisData, []);
  assert.equal(state.stepCount, 0);
  assert.deepEqual(state.emaValues, { trunk: 1 });
});
