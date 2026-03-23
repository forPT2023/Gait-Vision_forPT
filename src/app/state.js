export function createInitialAnalysisState({ createInitialEmaValues }) {
  return {
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
    emaValues: createInitialEmaValues()
  };
}

export function createStartedAnalysisState({ createInitialEmaValues, now = () => Date.now() }) {
  return {
    ...createInitialAnalysisState({ createInitialEmaValues }),
    analysisStartEpochMs: now()
  };
}
