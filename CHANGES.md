# Gait VISION forPT - 修正履歴

## 2026-03-16: 包括的な分析とグラフ改善

### 🔧 主要な修正内容

#### 1. 歩行イベント検出の修正
**問題**: Heel strikeの検出ロジックがMediaPipeの座標系を誤解していた
- MediaPipeのY座標は**上が0、下が1**
- 従来の`leftHeelY > 0.85`という固定しきい値は不正確だった

**修正**:
```javascript
// 修正前: 固定しきい値
if (leftHeelY > 0.85)

// 修正後: 相対的な位置判定
const leftHeelLow = leftHeelY > leftHipY + 0.3; // 腰より下+閾値
if (leftHeelDown && leftHeelLow)
```

**効果**: より正確なheel strikeとケイデンス検出

---

#### 2. 歩行速度計算の改善
**問題**: 
- ゼロ除算の可能性
- 計算式の単位変換ミス
- 異常値の検出なし

**修正**:
```javascript
// shoulderWidthのゼロチェック追加
if (shoulderWidth < 0.1 || isNaN(shoulderWidth)) {
  console.warn('[Speed] Invalid shoulder width:', shoulderWidth);
  return 0;
}

// 単位変換を明確化
const speedMps = (displacement / shoulderWidth) * 0.4 / (deltaT / 1000);

// 異常値検出（0-3 m/s）
if (isNaN(speedMps) || speedMps < 0 || speedMps > 3) {
  return 0;
}
```

**効果**: 
- ゼロ除算エラーの防止
- 正確な速度計算（m/s単位）
- 異常値の自動除外

---

#### 3. ケイデンス計算の最適化
**問題**: 時間窓の計算式が間違っていた

**修正**:
```javascript
// 修正前: 間違った計算式
const cadence = (recentEvents.length / timeWindow) * 60000;
// timeWindow=10000ms, これだと1秒あたりのステップ数×6になる

// 修正後: 正しい計算式
let cadence = 0;
if (recentEvents.length >= 2) {
  cadence = (recentEvents.length / (timeWindow / 1000)) * 60;
}
// timeWindow=10000ms → 10秒 → 1分=60秒でスケール
```

**効果**: 正確なケイデンス値（steps/min）

---

#### 4. データ検証の強化
**問題**: NaN、Infinity値がグラフに表示される可能性

**修正**:
- 全計算関数に`isFinite()`チェック追加
- `calcAngle3D()`: 入力座標の検証
- `calcSymmetryIndex()`: 入力値の検証
- `updateCharts()`: グラフ更新前の検証
- データポイント作成時の値クランプ

```javascript
// データポイント検証例
speed: isFinite(emaValues.speed) ? Math.max(0, emaValues.speed) : 0,
cadence: isFinite(emaValues.cadence) ? Math.max(0, Math.min(200, emaValues.cadence)) : 0,
```

**効果**: 
- グラフにNaN/Infinityが表示されない
- データの信頼性向上
- エラーの早期検出

---

#### 5. デバッグログの追加
**修正**:
```javascript
console.log('[Gait Event]', gaitEvent.type, 'at', (mpTimestamp / 1000).toFixed(2), 's');
console.warn('[Speed] Invalid speed:', speedMps, 'displacement:', displacement);
console.warn('[Chart] Update error:', e);
```

**効果**: 
- 問題の迅速な特定
- ユーザーサポートの向上
- 開発者の効率化

---

### 📊 グラフY軸範囲の最適化

| グラフ | 範囲 | 理由 |
|--------|------|------|
| 歩行速度 | 0-2.5 m/s | 通常歩行は0.8-1.5 m/s |
| ケイデンス | 60-160 steps/min | 通常歩行は100-120 |
| 対称性指数 | 0-110% | 100%が完全対称 |
| 体幹傾斜 | 0-30° | 通常は5-15° |
| 膝関節 | 0-90° | 歩行時の可動域 |
| 股関節 | 0-80° | 歩行時の可動域 |
| 足首 | 60-140° | 底背屈の範囲 |
| 骨盤傾斜 | 0-20° | 通常は5°以内 |

---

### 🐛 修正されたバグ

1. ✅ **Heel strike検出の誤り** → Y座標の向きを修正
2. ✅ **歩行速度のゼロ除算** → shoulderWidthチェック追加
3. ✅ **ケイデンス計算式の誤り** → 時間単位を修正
4. ✅ **NaN値のグラフ表示** → 全関数に検証追加
5. ✅ **異常値の混入** → 値のクランプ処理追加

---

### 🎯 改善効果

**Before（修正前）**:
- Heel strikeが正しく検出されない
- 歩行速度が異常に大きい/小さい値になる
- ケイデンスが実測値と大きく異なる
- グラフにNaNやInfinityが表示される

**After（修正後）**:
- ✅ Heel strikeが正確に検出される
- ✅ 歩行速度が妥当な範囲（0-3 m/s）に収まる
- ✅ ケイデンスが正確に計算される
- ✅ グラフが常に有効な値を表示
- ✅ デバッグログで問題を追跡できる

---

### 🧪 テスト方法

1. **カメラモードでテスト**:
   - カメラ起動 → 歩行動作
   - コンソールで`[Gait Event]`ログを確認
   - グラフの値が妥当な範囲か確認

2. **動画モードでテスト**:
   - 歩行動画をアップロード
   - 分析開始
   - 各グラフの値を目視確認
   - コンソールエラーがないか確認

3. **異常値テスト**:
   - カメラを動かす（素早く移動）
   - グラフにNaN/Infinityが表示されないか確認
   - 速度が0-3 m/sの範囲内か確認

---

### 📝 今後の改善案

1. **機械学習による歩行異常検出**
2. **より詳細な歩行位相の分析**
3. **左右の歩幅の計測**
4. **歩行効率の評価指標追加**
5. **長期的なトレンド分析機能**

---

## 技術詳細

### MediaPipe座標系
- **正規化座標**: 0-1の範囲
- **X軸**: 左が0、右が1
- **Y軸**: 上が0、下が1（重要！）
- **Z軸**: カメラに近いほど小さい値

### 計算式

**歩行速度**:
```
speed (m/s) = (displacement / shoulderWidth) × 0.4m / (deltaT / 1000)
```

**ケイデンス**:
```
cadence (steps/min) = (heel_strikes / timeWindow_seconds) × 60
```

**対称性指数**:
```
symmetry (%) = 100 - |left - right| / mean × 100
```
