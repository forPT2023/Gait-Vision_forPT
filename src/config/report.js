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
    // 遊脚期最大屈曲ピーク: 正常歩行では55〜70°。50°未満は遊脚クリアランス不足の可能性
    // normalMin/Max → evaluateMetricStatus で 🟢/🟡/🔴 判定に使用
    // lowBelow → コメントルール発火の閾値（50°未満でワーニングコメント）
    kneeSwingPeak: { normalMin: 55, normalMax: 70, lowBelow: 50 },
    // 立脚終期最大伸展ピーク（最小角度）: 正常では5〜15°。20°超で膝屈曲歩行（crouch gait）
    // elevatedAbove → コメントルール発火の閾値（20°超でCrouch歩行コメント）
    kneeStanceExt: { normalMin: 5, normalMax: 15, elevatedAbove: 20 },
    // ピーク左右差: 10°超でやや差あり、15°超で要注意
    kneeSwingPeakDiff: { threshold: 10, elevatedAbove: 15 },
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
      message: '⚠️ 左右の膝関節角度（平均）に大きな差があります。'
    },
    kneeDiffStable: {
      ruleId: 'sagittal.knee_diff.stable',
      message: '✅ 左右の膝関節角度差は小さく、安定しています。'
    },
    kneeSwingPeakLow: {
      ruleId: 'sagittal.knee_swing_peak.low',
      message: '⚠️ 遊脚期の膝屈曲ピークが低下しています（50°未満）。足趾のクリアランス不足や蹴り出し弱化が疑われます。'
    },
    kneeSwingPeakDiffElevated: {
      ruleId: 'sagittal.knee_swing_peak_diff.elevated',
      message: '⚠️ 遊脚期の膝屈曲ピーク（左右差）が大きいです。片側の遊脚期クリアランス低下を確認してください。'
    },
    kneeStanceExtElevated: {
      ruleId: 'sagittal.knee_stance_ext.elevated',
      message: '⚠️ 立脚期の膝伸展が不十分です（20°超）。Crouch歩行パターンの可能性があります。'
    },
    hipDiffElevated: {
      ruleId: 'sagittal.hip_diff.elevated',
      message: '⚠️ 体幹-大腿角度（股関節参考値）の左右差が大きく、骨盤代償の確認が必要です。'
    },
    ankleDiffElevated: {
      ruleId: 'sagittal.ankle_diff.elevated',
      message: '⚠️ 足関節角度の左右差が大きく、蹴り出しの非対称性が疑われます。'
    },
    pelvisElevated: {
      ruleId: 'sagittal.pelvis.elevated',
      message: '⚠️ 骨盤傾斜が大きめです。体幹・骨盤の安定性を確認してください。'
    },
    speedSlow: {
      ruleId: 'sagittal.speed.slow',
      message: '⚠️ 歩行速度が低めです（矢状面撮影のため誤差を含む参考値）。他の指標と合わせて評価してください。'
    },
    cadenceLow: {
      ruleId: 'sagittal.cadence.low',
      message: '⚠️ ケイデンスが低めです（100 spm 未満）。疲労・疼痛・神経学的問題の可能性があります。'
    },
    cadenceStrong: {
      ruleId: 'sagittal.cadence.strong',
      message: '✅ ケイデンスは良好な範囲です。'
    },
    overall: {
      ruleId: 'sagittal.overall.good',
      message: '✅ 全体的に良好な歩行パターンです。'
    }
  }
};
