export const REPORT_THRESHOLDS = {
  frontal: {
    speed: { normalMin: 0.8, normalMax: 1.4, slowBelow: 0.8, strongAbove: 1.5 },
    cadence: { normalMin: 100, normalMax: 130, lowBelow: 100, strongAbove: 120 },
    symmetry: { normalMin: 90, normalMax: 100, lowBelow: 85, strongAbove: 95 },
    trunk: { normalMin: 0, normalMax: 10, elevatedAbove: 15 }
  },
  sagittal: {
    leftKnee: { normalMin: 0, normalMax: 80 },
    rightKnee: { normalMin: 0, normalMax: 80 },
    leftAnkle: { normalMin: 60, normalMax: 120 },
    rightAnkle: { normalMin: 60, normalMax: 120 },
    pelvis: { normalMin: 0, normalMax: 10, elevatedAbove: 10 },
    kneeDiff: { threshold: 10, elevatedAbove: 15 },
    hipDiff: { threshold: 10, elevatedAbove: 15 },
    ankleDiff: { threshold: 5, elevatedAbove: 10 },
    speed: { normalMin: 0.8, normalMax: 1.4, slowBelow: 0.8, strongAbove: 1.5 },
    cadence: { normalMin: 100, normalMax: 130, lowBelow: 100, strongAbove: 120 }
  }
};

export const REPORT_COMMENT_RULES = {
  frontal: {
    speedSlow: {
      ruleId: 'frontal.speed.slow',
      message: '⚠️ 歩行速度が遅い傾向にあります。参考値として解釈し、必要に応じて追加測定を行ってください。'
    },
    speedStrong: {
      ruleId: 'frontal.speed.strong',
      message: '✅ 歩行速度は良好です。'
    },
    symmetryLow: {
      ruleId: 'frontal.symmetry.low',
      message: '⚠️ 対称性が低下しています。片側への偏りを確認してください。'
    },
    symmetryStrong: {
      ruleId: 'frontal.symmetry.strong',
      message: '✅ 左右対称性は非常に良好です。'
    },
    trunkElevated: {
      ruleId: 'frontal.trunk.elevated',
      message: '⚠️ 体幹の傾斜が大きいです。撮影平面と姿勢条件も含めて確認してください。'
    },
    cadenceLow: {
      ruleId: 'frontal.cadence.low',
      message: '⚠️ ケイデンスが低めです。歩行イベント検出品質も合わせて確認してください。'
    },
    cadenceStrong: {
      ruleId: 'frontal.cadence.strong',
      message: '✅ ケイデンスは良好な範囲です。'
    },
    overall: {
      ruleId: 'frontal.overall.good',
      message: '✅ 全体的に良好な歩行パターンです。'
    }
  },
  sagittal: {
    kneeDiffElevated: {
      ruleId: 'sagittal.knee_diff.elevated',
      message: '⚠️ 左右の膝関節角度に大きな差があります。'
    },
    kneeDiffStable: {
      ruleId: 'sagittal.knee_diff.stable',
      message: '✅ 左右の膝関節角度差は小さく、安定しています。'
    },
    hipDiffElevated: {
      ruleId: 'sagittal.hip_diff.elevated',
      message: '⚠️ 股関節角度の左右差が大きく、骨盤代償の確認が必要です。'
    },
    ankleDiffElevated: {
      ruleId: 'sagittal.ankle_diff.elevated',
      message: '⚠️ 足関節角度の左右差が大きく、蹴り出しの非対称性が疑われます。'
    },
    pelvisElevated: {
      ruleId: 'sagittal.pelvis.elevated',
      message: '⚠️ 骨盤傾斜が大きめです。体幹・骨盤の安定性を確認してください。'
    },
    overall: {
      ruleId: 'sagittal.overall.good',
      message: '✅ 全体的に良好な歩行パターンです。'
    }
  }
};
