# バグ調査レポート（2026-04-02）

## 1. 最新状態の読み込み
- 現在ブランチ: `work`
- `git status --short --branch` の結果、作業ツリーはクリーン。
- リモート設定が存在しないため、`git pull` による同期対象なし（ローカル最新状態を基準に調査）。

## 2. 実施した検証
### 2.1 自動テスト
- 実行コマンド: `npm test`
- 結果: **186/186 テスト成功、失敗 0**
- 追加所見: npm の `Unknown env config "http-proxy"` 警告あり（テスト自体は成功）。

### 2.2 静的サニティチェック
- `TODO/FIXME` 残件検索: ヒット 0
- `innerHTML =` 代入箇所: 2 箇所（`src/ui/reportModal.js`）
- `catch (...)` 構文の分布を確認し、主要非同期処理に例外処理あり

## 3. 調査結果サマリー
- **再現可能な致命的バグは今回の自動検証範囲では未検出**。
- 単体テストと構文チェックはグリーン。
- 既知リスクとして、`reportHTML` の生成元が将来外部入力を受けるように変わる場合、`innerHTML` 描画はXSS面の再評価が必要。

## 4. 次の深掘り提案（必要なら実施）
1. 実機での E2E 再現テスト（iOS Safari / Android Chrome / Desktop Safari）
2. 大容量動画（長尺・高FPS）でのメモリ推移計測
3. IndexedDB 失敗時のリカバリ導線を UI テストで明文化
4. レポートHTML出力のサニタイズ境界テスト追加

## 5. 追加対応（2026-04-02）
- `src/ui/reportModal.js` に `sanitizeReportHtml` を追加。
- `setReportHtml` で `innerHTML` 代入前に script タグ、インラインイベント属性、`javascript:` URL を除去するよう変更。
- `tests/ui.reportModal.test.mjs` にサニタイズのユニットテストを追加。
