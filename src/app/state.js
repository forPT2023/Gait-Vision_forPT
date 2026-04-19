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
    lastLeftHeelStrikeTime: 0,
    lastRightHeelStrikeTime: 0,
    leftHeelState: 'stable',
    rightHeelState: 'stable',
    emaLeftHeelY: null,
    emaRightHeelY: null,
    leftSwingPeak: null,
    rightSwingPeak: null,
    leftEventCount: 0,
    rightEventCount: 0,
    leftHadDownPhase: false,
    rightHadDownPhase: false,
    emaValues: createInitialEmaValues()
  };
}

export function createStartedAnalysisState({ createInitialEmaValues, now = () => Date.now() }) {
  return {
    ...createInitialAnalysisState({ createInitialEmaValues }),
    analysisStartEpochMs: now()
  };
}
