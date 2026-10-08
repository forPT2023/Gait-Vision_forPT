# Gait VISION forPT — 引き継ぎドキュメント (HANDOVER)

> **対象読者**: このリポジトリを引き継いで運用・開発を続けるAIエージェント（ChatGPT Codex等）  
> **最終更新**: v3.10.72 (2026-10)  
> **作成経緯**: Genspark AI Developer による開発セッションの完全な文脈をCodexへ引き継ぐために作成

---

## 1. アプリ概要

| 項目 | 内容 |
|---|---|
| アプリ名 | Gait VISION forPT |
| 用途 | 理学療法士向け AI 歩行分析 Web アプリ |
| 対象ユーザー | 理学療法士・作業療法士・リハビリ関連医療職 |
| 動作形態 | ブラウザで開くだけの Web アプリ（インストール不要） |
| 本番 URL | https://project-b4af0dec.pages.dev |
| GitHub | https://github.com/forPT2023/Gait-Vision_forPT |
| 現在バージョン | v3.10.72 |

---

## 2. 技術スタック

### フロントエンド
- **単一ファイル構成**: `index.html` にほぼ全ロジックが集約（約5,100行）
- **モジュール分割**: `src/` 以下に機能別 ES Module を配置（`index.html` から import）
- **UI フレームワーク**: なし（バニラ JS + Tailwind CSS CDN）

### 主要外部ライブラリ（すべて CDN 読み込み）
| ライブラリ | バージョン | 用途 |
|---|---|---|
| @mediapipe/tasks-vision | 0.10.21 | 姿勢推定（骨格検出） |
| Chart.js | 4.4.0 | リアルタイムグラフ描画 |
| Luxon | 3.4.4 | 時刻処理 |
| chartjs-adapter-luxon | 1.3.1 | Chart.js 用時刻アダプタ |
| chartjs-plugin-streaming | 2.0.0 | リアルタイムストリームグラフ |
| html2canvas | 1.4.1 | レポート画像化 |
| jsPDF | 2.5.1 | PDF 出力 |
| mp4-muxer | 5.2.2 | 解析動画エクスポート（MP4） |
| webm-muxer | 4.0.3 | 解析動画エクスポート（WebM） |
| Tailwind CSS | CDN | スタイリング |

### インフラ
- **ホスティング**: Cloudflare Pages
- **プロジェクト名**: `project-b4af0dec`
- **アカウント ID**: `caade0af55d0f5fed0e5ad3f46f330e1`
- **デプロイブランチ**: `main`

### 開発環境
- **ローカルサーバー**: `npm run dev`（python3 -m http.server 3000）
- **テスト**: `npm test`（Node.js 組み込みテストランナー、260テスト）
- **テストファイル**: `tests/*.test.mjs`

---

## 3. ディレクトリ構成

```
/
├── index.html              # アプリ本体（単一ファイル、約5,100行）
├── manifest.webmanifest    # PWA マニフェスト
├── sw.js                   # Service Worker（オフライン対応）
├── package.json
├── HANDOVER.md             # このファイル
├── src/
│   ├── analysis/
│   │   ├── constants.js    # MediaPipe ランドマーク定数 (LM.*) + EMA 初期値
│   │   ├── metrics.js      # 角度計算・歩行指標・EMA・KneePeakTracker
│   │   └── session.js      # cadence 計算・buildAnalysisDataPoint
│   ├── app/
│   │   ├── bootstrap.js    # 同意・患者ID 永続化
│   │   ├── session.js      # セッション保存・エクスポート
│   │   └── state.js        # 解析開始状態の初期化
│   ├── config/
│   │   ├── app.js          # APP_SEMVER・buildSessionId ★バージョン管理
│   │   ├── charts.js       # グラフ設定
│   │   └── report.js       # レポート設定
│   ├── pwa/
│   │   ├── install.js      # PWA インストール促進
│   │   └── serviceWorker.js# SW 登録・キャッシュ管理
│   ├── report/
│   │   ├── metricCard.js   # 指標カード HTML 生成
│   │   ├── render.js       # レポート HTML 生成
│   │   ├── summary.js      # 指標サマリー計算
│   │   └── templates/
│   │       ├── frontal.js  # 前額面レポートテンプレート
│   │       └── sagittal.js # 矢状面レポートテンプレート
│   ├── storage/
│   │   ├── db.js           # IndexedDB 暗号化（AES-GCM）セッション管理
│   │   └── export.js       # CSV エクスポート
│   ├── ui/
│   │   ├── charts.js       # グラフ初期化・更新
│   │   ├── controls.js     # ボタン状態管理
│   │   ├── deviceMode.js   # スマホ/デスクトップ判定
│   │   ├── guideModal.js   # 指標ガイドモーダル
│   │   ├── notifications.js# 通知表示
│   │   ├── orientation.js  # 縦横向き警告
│   │   ├── patient.js      # 患者 ID バリデーション
│   │   ├── phoneFlow.js    # スマホ版 UI フロー状態管理
│   │   ├── reportModal.js  # レポートモーダル
│   │   ├── screens.js      # 画面遷移（同意→患者ID→メイン）
│   │   └── viewport.js     # viewport 高さ管理（dvh 対応）
│   └── video/
│       ├── camera.js       # カメラ起動（getUserMedia）
│       ├── display.js      # calcVideoDrawRect（object-fit:contain 計算）★重要
│       ├── recording.js    # MediaRecorder 録画
│       ├── runtime.js      # 解析ループ制御・タイムスタンプ管理
│       └── videoFile.js    # 動画ファイル読み込み・シーク
└── tests/                  # 全27ファイル・260テスト
```

---

## 4. 主要機能

### 分析面
| 分析面 | 主な計測指標 |
|---|---|
| 前額面 | 歩行速度・ケイデンス・左右対称性・体幹側屈・骨盤傾斜 |
| 矢状面 | 膝関節屈伸・股関節屈伸・足関節角度・骨盤前後傾 |

### 入力方法
- **リアルタイムカメラ**: getUserMedia → MediaPipe PoseLandmarker → リアルタイム描画
- **動画ファイル**: ローカル動画 → seek-driven 解析 → 解析動画生成

### 出力
- **解析動画**: 骨格マーカー重畳動画（WebCodecs 優先 / MediaRecorder フォールバック）
- **レポート**: HTML レポート（印刷・PDF 保存対応）
- **CSV**: フレームごとの数値データ

### データ管理
- **保存場所**: IndexedDB（AES-GCM 256bit 暗号化）
- **外部送信**: 一切なし（完全ローカル処理）
- **初回のみ**: CDN からライブラリ読み込み（Service Worker でキャッシュ）

---

## 5. バグ修正履歴（Bug#6〜Bug#11）

> ⚠️ **これが最重要セクションです。** 同じバグを再発させないために必ず読んでください。

### Bug#6: trunk/pelvis EMA ガード不足（v3.10.64）
- **症状**: `worldLandmarks` が null のフレームで EMA 計算がクラッシュ
- **原因**: `calcPelvicTilt` / `calcTrunkAngle` が null チェックなしで実行
- **修正**: worldLandmarks が null の場合は EMA 更新をスキップ

### Bug#7: sessionId の二重生成（v3.10.64）
- **症状**: DB 保存時とレポート表示時で sessionId が異なり、データが一致しない
- **原因**: `buildSessionId()` を DB 保存と `createReportSummary` の両方で個別に呼んでいた
- **修正**: 解析開始時に1回だけ生成して `currentSessionId` にキャッシュ。両方に同じ ID を渡す

### Bug#8: speed EMA ガード不足（v3.10.65）
- **症状**: `worldLandmarks=null` のフレームで speed 計算がエラー
- **原因**: speed 計算が worldLandmarks を前提としていたが null チェックがなかった
- **修正**: worldLandmarks が null のフレームでは speed EMA を更新しない

### Bug#9: symmetry null 化・speed=0 チャートスキップ（v3.10.66）
- **症状**: 対称性指数が不正値になる、speed=0 フレームがグラフに混入
- **原因**: symmetry が計算不能な場合も 0 として格納、speed=0 フレームも push
- **修正**: symmetry は null で返し、speed=0 フレームはグラフ追加をスキップ

### Bug#10: 解析動画エクスポート問題（v3.10.67〜v3.10.72）
複数のサブバグが存在。バージョン別に整理：

| バージョン | 修正内容 |
|---|---|
| v3.10.67 (v1) | 解析終了後に動画が短く切れる → `exportEndSec = videoDurationSec` に修正 |
| v3.10.68 (v3) | マーカーが動画開始より遅れて出現 → `exportStartSec = analysisVideoStartMs / 1000` に変更（1000ms ウォームアップオフセットを削除） |
| v3.10.69 | 解析開始直後の映像/マーカーズレ → ブリッジ描画ループを追加 |
| v3.10.72 (v4) | ウォームアップ区間（frameCount ≤ 3）でも誤ってマーカーが表示 → `isInAnalysisRange` 判定を `firstElapsedMs` 基準に修正 |

**Bug#10 の核心設計（必読）:**
```
解析データの時刻基準:
  elapsedMs = detectTimestamp - analysisStartMpTimestamp
  analysisVideoStartMs = analysisStartMpTimestamp - mpTimestampOffset

エクスポートフレームの時刻基準:
  exportStartSec = analysisVideoStartMs / 1000
  targetElapsedMs = fi * exportFrameIntervalMs - (exportStartSec * 1000 - analysisVideoStartMs)
                  = fi * exportFrameIntervalMs  ← ウォームアップ分は dataPoint=null

isInAnalysisRange の条件:
  cond1: targetElapsedMs >= firstElapsedMs - exportFrameIntervalMs
  cond2: |nearestElapsedMs - targetElapsedMs| <= 2 * exportFrameIntervalMs
```

### Bug#11: スマホ動画モードでのキャンバスサイズ不一致（v3.10.71）
- **症状**: スマホで2回目以降の解析、またはカメラ→動画切り替え後にマーカーが大きくずれる
- **原因**:
  1. スマホ動画モードでは `#canvas-container` が `display:none` → `resizeCanvas()` がスキップされる
  2. **キャンバスが前回の解析サイズのまま残る**（例: カメラ 1280×720 → 縦動画 1080×1920）
  3. 従来のゼロサイズガードは `canvas != 0` なので発動しない
  4. `analysisCanvasWidth=1280, Height=720` のまま解析が走る
  5. `aRect = calcVideoDrawRect(1280, 720, 1080, 1920) = {x:437, y:0, w:405, h:720}` という誤矩形
  6. エクスポート時のランドマーク座標変換が大きくずれる
- **修正**: `startAnalysis` 冒頭のキャンバスサイズ保証ガードを拡張
  ```js
  // container が非表示 かつ キャンバスサイズが動画と不一致 → 常にリセット
  const needsReset = containerHidden && (
    canvasElement.width  === 0 || canvasElement.height === 0 ||
    canvasElement.width  !== pxW || canvasElement.height !== pxH
  );
  ```
- **場所**: `index.html` の `startAnalysis` 関数冒頭（「スマホ動画モードのキャンバスサイズ保証」コメント付近）

---

## 6. 設計上の重要な制約・注意事項

### MediaPipe 関連
- **`poseLandmarker.close()` を呼んではいけない**: WebGL コンテキストが破棄され、再初期化できなくなる（v3.10.7 で発覚）
- **detectForVideo のタイムスタンプ**: 必ず単調増加でなければならない。`lastDetectForVideoTimestamp` で管理
- **ランドマーク正規化座標**: `detectForVideo(canvasElement, ...)` に渡すと「canvas 全体」基準で正規化される。`videoElement` を渡すと「動画」基準。現在は `canvasElement` を渡しているため `drawEnhancedLandmarks` には `videoW=0, videoH=0` を渡すこと（二重オフセット防止）

### iOS Safari 固有の問題
- **回転メタデータ**: `videoElement.videoWidth/Height` は回転適用後のサイズを返す。`exportVideoElement` も同様
- **seeked イベント**: iOS Safari では `seeked` が発火しないことがある → タイムアウト + ポーリングで対応済み（`seekTo()` 関数）
- **同一 ObjectURL の二重ロード**: `videoElement` と `exportVideoElement` に同じ URL を使うと GPU デコーダー競合 → `fetch()` で Blob を再取得して別 URL を生成する対応済み
- **OOM 対策**: エクスポートキャンバスは `MAX_EXPORT_EDGE = 1280px` に制限（iOS Safari メモリ上限対応）
- **`position:fixed` バグ**: iOS 26.3 以降で既知の不具合あり（ユーザー問い合わせ対応時に注意）

### エクスポート動画のコーデック選択順
```
A: AVC/H.264 (AVCC形式) + mp4-muxer    → Chrome/Firefox/Edge
B: AVC/H.264 (Annex-B形式) + mp4-muxer → Safari/iOS
C: VP9 + webm-muxer                     → AVC非対応環境（VP9+mp4-muxer は colorSpace エラーで NG）
D: VP8 + webm-muxer                     → 最終フォールバック
```
**VP9 + mp4-muxer を使わない理由**: `mp4-muxer@5.2.2` は VP9 の `decoderConfig` に `colorSpace` が必須だが、WebCodecs が返す colorSpace は実装依存で不定のため `addVideoChunk` 時にエラーが発生しやすい。

### `calcVideoDrawRect` の使い方（重要）
```js
// object-fit:contain 相当の矩形計算
calcVideoDrawRect(canvasW, canvasH, videoW, videoH)
// videoW/H = 0 を渡すと {x:0, y:0, w:canvasW, h:canvasH} を返す（canvas 全体にフォールバック）
```
- 解析ループ中の `drawEnhancedLandmarks` 呼び出しでは `videoW=0, videoH=0` を渡す（canvasElement に detectForVideo を渡しているため）
- エクスポート時の `drawFrame` では affine transform で変換（`scaleX/Y`, `transX/Y`）

### Service Worker・キャッシュ
- `sw.js` は MediaPipe モデルファイル・CDN ライブラリをキャッシュ
- キャッシュクリアは「設定 → キャッシュをクリア」から（`navigator.serviceWorker.getRegistrations()` で全登録解除）
- `globalThis.caches` を使用（テスト環境でモック可能にするため）

### IndexedDB 暗号化
- AES-GCM 256bit、IV 12byte
- `TextEncoder/TextDecoder` は `globalThis` 経由でアクセス（テスト環境対応）
- ストレージ使用量が 80% 超でユーザーに警告

---

## 7. スマホ版（phoneFlow）の UI フロー

```
deviceMode = 'phone' のとき phoneFlow が有効

画面遷移:
  capture（動画取得）→ analyzing（解析中）→ results（結果・出力）

phoneFlowView の状態変数で管理。
syncUI() が呼ばれるたびに getPhoneFlowState() → applyPhoneFlowUi() で DOM に反映。

重要:
- #canvas-container は phone モード時に display:none（canvas のサイズ取得不可）
- スマホ専用の動画プレビューエリア: #phone-original-preview / #phone-analyzed-preview
- 解析完了後に解析動画プレビューを自動生成: renderAnalyzedVideoBlob() → ensureAnalyzedPreviewReady()
```

---

## 8. バージョン管理ルール

バージョンは以下の3箇所を同時に更新する：

```
src/config/app.js          APP_SEMVER = 'X.Y.Z'
tests/config.app.test.mjs  assert.equal(APP_SEMVER, 'X.Y.Z')
index.html                 console.log('[Gait-Vision] vX.Y.Z loaded — ...')
```

バージョン番号の規則: `3.10.XX`（現在 3.10.72 まで使用）

---

## 9. デプロイ手順

```bash
# 1. main ブランチで作業
git checkout main

# 2. コード修正

# 3. テスト実行（必ず全 pass を確認）
npm test

# 4. バージョン番号を上げる（src/config/app.js, tests/config.app.test.mjs, index.html の3箇所）

# 5. コミット
git add -A
git commit -m "fix(xxx): 説明 vX.Y.Z"

# 6. PR ワークフロー（genspark_ai_developer ブランチを経由する場合）
git checkout -B genspark_ai_developer
git push -f origin genspark_ai_developer
gh pr create --base main --head genspark_ai_developer
gh pr merge <PR番号> --merge --admin
git checkout main && git pull origin main

# 7. Cloudflare Pages デプロイ
CLOUDFLARE_API_TOKEN=<トークン> \
CLOUDFLARE_ACCOUNT_ID=caade0af55d0f5fed0e5ad3f46f330e1 \
npx wrangler pages deploy . --project-name project-b4af0dec --branch main
```

---

## 10. テスト構成

```bash
npm test
# = npm run check && npm run test:unit
# check: scripts/check-inline-module.mjs（index.html のインライン import 検証）
# test:unit: Node.js 組み込みテストランナーで tests/*.test.mjs を実行
```

- **現在のテスト数**: 260
- **テストフレームワーク**: Node.js 組み込み（`node --test`）
- **モック方針**: DOM・Web API は引数経由で注入（依存性注入）してテスト可能にしている

---

## 11. Git ワークフロー

- **メインブランチ**: `main`
- **開発ブランチ**: `genspark_ai_developer`（PR を通じて main にマージ）
- **コミット規約**: conventional commits（`fix(scope):`, `feat(scope):`, etc.）
- **PR**: `genspark_ai_developer` → `main`

---

## 12. よくある問い合わせと対応

### 「同意画面から先に進めない」（iOS Safari）
- **最有力原因**: プライベートブラウズモード使用 → localStorage が使用不可
- **対処**: 通常タブで開き直す / Safariのキャッシュクリア
- **その他**: iOS 26.3 以降の Safari で `position:fixed` 関連バグの報告あり
  → 設定 → アプリ → Safari → 詳細 → 機能フラグ → 「すべてデフォルトにリセット」

### 「2回目の解析でマーカーがずれる」
- Bug#11 で修正済み（v3.10.71）
- もし再発するなら `startAnalysis` 冒頭の「スマホ動画モードのキャンバスサイズ保証」ブロックを確認

### 「解析動画のマーカーが遅れて出現する」
- Bug#10 v3 で修正済み（v3.10.68）
- `exportStartSec = analysisVideoStartMs / 1000` になっているか確認

### 「解析動画が短く切れる」
- Bug#10 v1 で修正済み（v3.10.67）
- `exportEndSec = videoDurationSec` になっているか確認

---

## 13. Codex への引き継ぎチェックリスト

Codex でこのリポジトリを引き継ぐ場合、以下を最初に実行・確認すること：

- [ ] `npm test` を実行して 260 テストが全 pass であることを確認
- [ ] `src/config/app.js` の `APP_SEMVER` を確認（現在 `3.10.72`）
- [ ] `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を Codex の環境変数またはシークレットに設定
- [ ] このドキュメント（HANDOVER.md）の「バグ修正履歴」セクションを読んで過去の失敗を把握
- [ ] 修正後は必ず `npm test` → バージョン更新 → コミット → デプロイの順で実施

---

*このドキュメントはアプリの運用・改修を引き継ぐ AI エージェントが初回から正確な文脈で作業できるよう設計されています。疑問点はコード内のコメント（日本語）を参照してください。*
