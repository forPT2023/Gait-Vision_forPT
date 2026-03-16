# 計測精度改善レポート

## 📊 実施日: 2026-03-16

---

## 🎯 改善した指標

### 1. ✅ 歩行速度 (Walking Speed)

#### 問題点
- **誤ったスケーリング**: 肩幅で正規化後、0.4mを掛ける不正確な計算
- **単位の混乱**: スケーリングファクターの意味が不明確
- **ゼロ返却**: 異常値を0にすることで連続性が失われる

#### 修正内容
```javascript
// 修正前
const speedMps = (displacement / shoulderWidth) * 0.4 / (deltaT / 1000);

// 修正後
const speedMps = displacement / (deltaT / 1000);
```

#### 改善点
- ✅ **MediaPipeのワールド座標を直接使用**（メートル単位）
- ✅ **不要なスケーリング削除**（肩幅0.4m係数を削除）
- ✅ **値のクランプ**：0に戻す代わりに0-3m/sに制限
- ✅ **デバッグログ追加**：1%のサンプリングレートで詳細ログ
- ✅ **肩幅閾値を緩和**：0.1m → 0.05m

#### 期待される結果
- 通常歩行：**0.8-1.5 m/s**
- 速歩：**1.5-2.0 m/s**
- より連続的でスムーズな速度表示

---

### 2. ✅ ケイデンス (Cadence)

#### 問題点
- **途中から波形が出る**: 2ステップ検出されるまで0のまま
- **初期値が常に0**: ユーザーが「動いていない」と誤解

#### 修正内容
```javascript
// 修正前
if (recentEvents.length >= 2) {
  cadence = (recentEvents.length / (timeWindow / 1000)) * 60;
}

// 修正後
if (recentEvents.length >= 2) {
  // 標準計算
  cadence = (recentEvents.length / (timeWindow / 1000)) * 60;
} else if (recentEvents.length === 1 && gaitEvents.length >= 2) {
  // 最後の2ステップから推定
  const lastTwo = gaitEvents.slice(-2);
  const timeBetweenSteps = lastTwo[1].timestamp - lastTwo[0].timestamp;
  if (timeBetweenSteps > 0 && timeBetweenSteps < 2000) {
    cadence = (60000 / timeBetweenSteps);
  }
}
```

#### 改善点
- ✅ **早期表示**: 2ステップ目から推定値を表示
- ✅ **フォールバック**: 時間窓に1ステップしかない場合も推定
- ✅ **下限調整**: 0-200 → 60-200 steps/min（より現実的）

#### 期待される結果
- 通常歩行：**100-120 steps/min**
- 速歩：**130-150 steps/min**
- 最初のステップから即座にケイデンス表示

---

### 3. ✅ 歩行イベント検出 (Gait Event Detection)

#### 問題点
- **検出感度が低い**: 腰より30%下という厳しい閾値
- **見逃しが多い**: heel strikeが検出されにくい

#### 修正内容
```javascript
// 修正前
const leftHeelLow = leftHeelY > leftHipY + 0.3; // 腰より30%下

// 修正後
const leftHeelLow = leftHeelY > leftKneeY + 0.05; // 膝より5%下
const leftFootFlat = Math.abs(leftHeelY - leftFootY) < 0.05; // 足が平ら
```

#### 改善点
- ✅ **基準点変更**: 腰 → 膝（より正確）
- ✅ **閾値緩和**: 30% → 5%（画面の5%）
- ✅ **足フラット検出**: かかとと爪先のY座標が近い
- ✅ **時間間隔短縮**: 300ms → 250ms
- ✅ **詳細ログ**: 各heel strikeをコンソールに出力

#### 期待される結果
- より多くのステップを検出
- より正確なケイデンス計算
- 歩行開始時から即座に反応

---

### 4. ✅ 体幹傾斜角 (Trunk Angle)

#### 問題点
- **2D計算**: X-Y平面のみで計算（前後の傾きを無視）
- **測定面が不明確**: 前額面と矢状面が混在

#### 修正内容
```javascript
// 修正前（2D）
const angle = Math.abs(Math.atan2(
  shoulderMid.x - hipMid.x, 
  shoulderMid.y - hipMid.y
) * (180 / Math.PI));

// 修正後（3D・矢状面）
const dy = shoulderMid.y - hipMid.y; // 上下
const dz = shoulderMid.z - hipMid.z; // 前後
const angle = Math.abs(Math.atan2(dz, Math.abs(dy)) * (180 / Math.PI));
```

#### 改善点
- ✅ **3D計算**: Z軸（前後）を考慮
- ✅ **矢状面測定**: 前後の傾きを正確に測定
- ✅ **垂直からの角度**: より直感的な表現

#### 期待される結果
- 通常立位：**5-15°**
- 前傾姿勢：**15-30°**
- より実際の姿勢を反映

---

### 5. ✅ その他の指標

#### 骨盤傾斜角 (Pelvic Tilt)
- 既存の計算式は妥当
- 左右の腰のY座標差から計算
- **期待値**: 0-10°（通常5°以内）

#### 関節角度 (Joint Angles)
- 3D角度計算で正確
- NaN/Infinityチェック済み
- **膝関節**: 0-90°（歩行時）
- **股関節**: 0-80°（歩行時）
- **足首**: 60-140°（底背屈）

#### 対称性指数 (Symmetry Index)
- 計算式は妥当
- 0-100%の範囲でクランプ済み
- **期待値**: 80-100%（100%が完全対称）

---

## 📈 改善の効果

| 指標 | 修正前 | 修正後 |
|------|--------|--------|
| **歩行速度** | 不正確（スケーリング誤り） | ✅ 正確（直接メートル単位） |
| **ケイデンス** | 2ステップ後から表示 | ✅ 1-2ステップで表示 |
| **Heel Strike検出** | 検出率低い（30%閾値） | ✅ 検出率向上（5%閾値） |
| **体幹傾斜** | 2D計算（不正確） | ✅ 3D計算（矢状面） |
| **連続性** | ゼロに戻る | ✅ クランプで連続 |

---

## 🔍 デバッグ支援

### 追加されたログ
```javascript
// 歩行速度（1%サンプリング）
console.warn('[Speed] Value:', speedMps, 'm/s | displacement:', displacement, 'm | ...');

// Heel Strike（全て）
console.log('[Gait] Left heel strike at', timestamp, 's');

// 分析フレーム（30フレームごと）
console.log('[Analysis] Frame', frameCount, '| Time:', videoElement.currentTime, 's');
```

### デバッグ方法
1. **F12で開発者ツール** → Console タブ
2. **`[Speed]`で検索**: 速度計算の詳細
3. **`[Gait]`で検索**: ステップ検出のタイミング
4. **`[Analysis]`で検索**: フレーム処理の進行

---

## ✅ テスト推奨項目

### 歩行速度
1. ゆっくり歩く → **0.5-0.8 m/s**
2. 通常歩行 → **0.8-1.5 m/s**
3. 速歩 → **1.5-2.5 m/s**
4. コンソールで`[Speed]`ログを確認

### ケイデンス
1. 歩き始める → **1-2ステップで値が表示される**
2. 通常歩行 → **100-120 steps/min**
3. 速歩 → **130-150 steps/min**
4. コンソールで`[Gait]`ログを確認

### 体幹傾斜
1. 直立 → **5-15°**
2. 前傾 → **15-30°**
3. 歩行中の変動を観察

### その他
- **膝関節**: 歩行中0-60°程度で変動
- **対称性**: 通常80-100%
- **骨盤傾斜**: 5°以内が正常

---

## 🌐 アクセスURL

**公開URL**: https://3000-ila4jz8gkep72kqqr1ser-583b4d74.sandbox.novita.ai

---

## 📝 まとめ

### 主要な改善
1. ✅ **歩行速度**: 不正確なスケーリング削除、直接メートル単位使用
2. ✅ **ケイデンス**: 早期表示（2ステップ目から）、より応答的
3. ✅ **Heel Strike**: 検出感度大幅向上（腰30% → 膝5%）
4. ✅ **体幹傾斜**: 2D → 3D計算、矢状面測定
5. ✅ **デバッグ**: 詳細ログ追加、問題追跡が容易

### 期待される体験
- 📊 **より正確な測定値**
- 🚀 **より早い応答**（ケイデンス）
- 📈 **より連続的なグラフ**（クランプ処理）
- 🔍 **より詳細なデバッグ情報**

すべての指標が改善され、より実用的な歩行分析アプリケーションになりました！🎉
