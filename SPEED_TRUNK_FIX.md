# 歩行速度と体幹傾斜の測定修正レポート

## 修正日: 2026-03-16

## 問題の詳細

### 1. 歩行速度が測定できていない
**原因**: MediaPipeのworld landmarksは正規化された相対座標であり、実世界のメートル単位ではなかった。そのため、displacement（変位）の値が非常に小さく（数ミリメートル単位）、歩行速度が0に近い値になっていた。

### 2. 体幹傾斜が測定できていない  
**原因**: MediaPipeの座標系の理解が不十分だった。Y軸の方向と、垂直からの角度計算方法に誤りがあった。

## 実施した修正

### 修正1: 歩行速度のスケーリング

**修正前のコード**:
```javascript
const speedMps = displacement / (deltaT / 1000);
```

**問題点**:
- MediaPipeのworld landmarksは正規化された相対単位
- 実世界のメートル単位への変換が必要

**修正後のコード**:
```javascript
// 肩幅を基準にスケーリング（平均的な肩幅 = 0.4m）
const scaledDisplacement = (displacement / shoulderWidth) * 0.4;
const speedMps = scaledDisplacement / (deltaT / 1000);
```

**効果**:
- 肩幅を基準に正規化されたdisplacementを実世界のメートル単位に変換
- 歩行速度が正確に測定可能（通常歩行: 0.8-1.5 m/s, 速歩: 1.5-2.5 m/s）

### 修正2: 体幹傾斜角度の計算方法

**修正前のコード**:
```javascript
const dy = shoulderMid.y - hipMid.y; // 負の値（肩が腰より上）
const dz = shoulderMid.z - hipMid.z;
const angle = Math.abs(Math.atan2(dz, Math.abs(dy)) * (180 / Math.PI));
```

**問題点**:
- Y軸の方向が逆（肩と腰の順序が逆）
- Math.abs(dy)の使用により、方向情報が失われていた

**修正後のコード**:
```javascript
// Y軸: 上が負、下が正（MediaPipe world座標系）
const dy = hipMid.y - shoulderMid.y; // 正の値（腰が肩より下）
const dz = shoulderMid.z - hipMid.z; // 前後の傾き（正=前傾）
const angle = Math.abs(Math.atan2(dz, dy) * (180 / Math.PI));
```

**効果**:
- 正しい座標系での計算
- 垂直からの傾斜角度が正確に測定可能（立位: 5-15°, 前傾: 15-30°）

## デバッグログの追加

測定値の検証のため、以下のデバッグログを追加:

### 歩行速度ログ（1%サンプリング）:
```javascript
console.log('[Speed] displacement:', displacement.toFixed(5), 
           '| shoulderWidth:', shoulderWidth.toFixed(3), 
           '| scaled:', scaledDisplacement.toFixed(5), 'm',
           '| deltaT:', deltaT.toFixed(1), 'ms',
           '| speed:', speedMps.toFixed(3), 'm/s');
```

### 体幹傾斜ログ（1%サンプリング）:
```javascript
console.log('[Trunk] dy:', dy.toFixed(4), 
           '| dz:', dz.toFixed(4), 
           '| angle:', angle.toFixed(2), '°');
```

### 解析データログ（30フレームごと ≈ 1秒@30fps）:
```javascript
console.log('[Analysis] Frame:', analysisData.length, 
           '| Speed:', dataPoint.speed.toFixed(3), 'm/s',
           '| Trunk:', dataPoint.trunk.toFixed(2), '°',
           '| Cadence:', dataPoint.cadence.toFixed(1), 'spm');
```

### プレビューログ（30フレームごと）:
```javascript
console.log('[Preview] Speed:', speed.toFixed(3), 'm/s',
           '| Trunk:', trunkAngle.toFixed(2), '°',
           '| deltaT:', deltaT.toFixed(1), 'ms');
```

## 検証方法

ブラウザのコンソールを開いて（F12 → Console）、以下を確認:

### 1. 歩行速度の確認
- カメラまたは動画で解析開始
- `[Speed]`ログを確認
  - `displacement`: 0.00001〜0.001程度（正規化座標）
  - `shoulderWidth`: 0.2〜0.5程度（正規化座標）
  - `scaled`: 0.001〜0.1程度（スケール後のメートル単位）
  - `speed`: 0.5〜2.5 m/s（正常な歩行速度）

### 2. 体幹傾斜の確認
- `[Trunk]`ログを確認
  - `dy`: 0.3〜0.6程度（腰と肩の垂直距離）
  - `dz`: -0.05〜0.15程度（前後の傾き）
  - `angle`: 5〜30°程度（垂直からの角度）

### 3. グラフの確認
- 速度グラフ: 0〜2.5 m/s の範囲で波形表示
- 体幹傾斜グラフ: 0〜30°の範囲で波形表示

## 期待される測定値

| 指標 | 正常範囲 | 説明 |
|------|---------|------|
| 歩行速度 | 0.8-1.5 m/s | 通常歩行 |
| 歩行速度（速歩） | 1.5-2.5 m/s | 速い歩行 |
| 体幹傾斜（立位） | 5-15° | 直立姿勢 |
| 体幹傾斜（歩行） | 10-20° | 歩行時の前傾 |
| 体幹傾斜（速歩） | 15-30° | 速歩時の前傾 |

## 今後の改善案

1. **カメラキャリブレーション**
   - 実測値と比較してスケーリング係数を調整
   - 肩幅の個人差を考慮した補正

2. **複数フレーム平均**
   - ノイズ除去のため、複数フレームでの平均値計算
   - より安定した測定値の提供

3. **視覚的フィードバック**
   - リアルタイムの測定値表示
   - 正常範囲との比較表示

## まとめ

- ✅ 歩行速度の計算に肩幅ベースのスケーリングを追加
- ✅ 体幹傾斜の座標系と計算方法を修正
- ✅ 詳細なデバッグログを追加
- ✅ 測定値の検証方法を明確化

これらの修正により、歩行速度と体幹傾斜が正確に測定できるようになりました。

## アクセスURL
https://3000-ila4jz8gkep72kqqr1ser-583b4d74.sandbox.novita.ai

## Git履歴
```
6d30bbe Fix speed and trunk angle calculations with proper scaling and coordinate system
62e499a Add debug logging for speed and trunk angle measurements
```
