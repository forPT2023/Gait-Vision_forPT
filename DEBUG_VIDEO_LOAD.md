# 動画アップロード問題のデバッグガイド

## 実施日: 2026-03-17

## 🔍 追加した詳細ログ

動画アップロードの問題を特定するため、以下の詳細なログを追加しました。

### **loadVideoFile() - 動画読み込み処理**

```
[Video] loadVideoFile() called
[Video] File input created, opening dialog...
[Video] File selected
[Video] Starting load process for: movie.mp4
[Video] Loading: movie.mp4 12.34 MB
[Video] Object URL created: blob:http://...
[Video] Video element configured
[Video] Setting up event listeners...
[Video] Waiting for video to load...
[Video] Setting src to: blob:http://...
[Video] src set, waiting for load events...
[Video] Event fired: loadedmetadata | readyState: 2 | dimensions: 1920 x 1080
[Video] ✅ Loaded successfully: 1920 x 1080
[Video] Promise resolved - video loaded
[Video] Initializing MediaPipe for first time...
[Video] First frame drawn (または Video not fully ready yet...)
[Video] Load complete - ready to start analysis
```

### **initPoseLandmarker() - MediaPipe初期化**

```
[MediaPipe] Initializing...
[MediaPipe] Closing previous instance... (2回目以降)
[MediaPipe] Previous instance closed
[MediaPipe] Loading vision tasks...
[MediaPipe] Vision tasks loaded
[MediaPipe] Creating PoseLandmarker with GPU delegate...
[MediaPipe] ✅ GPU delegate initialized (or ⚠️ GPU delegate failed, fallback to CPU)
[MediaPipe] ✅ Initialization complete
```

---

## 📋 デバッグ手順

### **ステップ1: ブラウザを完全にリロード**

1. ブラウザでアプリを開く
2. **Ctrl+Shift+R** (Windows/Linux) または **Cmd+Shift+R** (Mac) でスーパーリロード
3. キャッシュが完全にクリアされたことを確認

### **ステップ2: コンソールを開く**

1. **F12キー**を押す（または右クリック→「検証」→「Console」タブ）
2. コンソールをクリアする（🚫アイコンまたはCmd+K / Ctrl+L）
3. コンソールログのフィルターを「すべて」に設定

### **ステップ3: 動画をアップロード（1回目）**

1. 「📁 動画」ボタンをクリック
2. ファイル選択ダイアログが開くか確認
3. 動画ファイルを選択
4. コンソールのログを確認

### **期待されるログ（正常な場合）**:

```
[Video] loadVideoFile() called
[Video] File input created, opening dialog...
[Video] input.click() called successfully
[Video] File selected
[Video] Starting load process for: movie.mp4
[Video] Loading: movie.mp4 12.34 MB
[Video] Object URL created: blob:...
[Video] Video element configured
[Video] Setting up event listeners...
[Video] Waiting for video to load...
[Video] Setting src to: blob:...
[Video] src set, waiting for load events...
[Video] Event fired: loadedmetadata | readyState: 2 | dimensions: 1920 x 1080
[Video] ✅ Loaded successfully: 1920 x 1080
[Video] Promise resolved - video loaded
[Video] Initializing MediaPipe for first time...
[MediaPipe] Initializing...
[MediaPipe] Loading vision tasks...
[MediaPipe] Vision tasks loaded
[MediaPipe] Creating PoseLandmarker with GPU delegate...
[MediaPipe] ✅ GPU delegate initialized
[MediaPipe] ✅ Initialization complete
[Video] First frame drawn
[Video] Load complete - ready to start analysis
```

---

## ❌ 考えられるエラーパターン

### **パターン1: ファイルダイアログが開かない**

**ログ**:
```
[Video] loadVideoFile() called
[Video] File input created, opening dialog...
❌ [Video] Failed to trigger file dialog: ...
```

**原因**: ブラウザのポップアップブロック

**対処法**:
1. アドレスバーの右側の「🚫」アイコンをクリック
2. 「ポップアップとリダイレクトを許可」を選択
3. ページをリロードして再試行

---

### **パターン2: ファイル選択後にログが出ない**

**ログ**:
```
[Video] loadVideoFile() called
[Video] File input created, opening dialog...
[Video] input.click() called successfully
(これ以降、何も出力されない)
```

**原因**: `input.onchange`イベントが発火していない

**対処法**:
1. ファイルを実際に選択しているか確認（キャンセルしていないか）
2. ブラウザの開発者ツールで`input.files[0]`を確認
3. 別のブラウザ（Chrome/Edge）で試す

---

### **パターン3: 動画の読み込みがタイムアウト**

**ログ**:
```
[Video] Setting src to: blob:...
[Video] src set, waiting for load events...
(30秒待機)
❌ [Video] Load timeout after 30 seconds
```

**原因**: 
- 動画ファイルが大きすぎる
- 動画形式が非対応
- ブラウザのメモリ不足

**対処法**:
1. 動画ファイルサイズを確認（推奨: 100MB以下）
2. MP4形式（H.264コーデック）に変換
3. ブラウザを再起動してメモリをクリア

---

### **パターン4: イベントが発火するが dimensions が 0**

**ログ**:
```
[Video] Event fired: loadedmetadata | readyState: 1 | dimensions: 0 x 0
⚠️ [Video] Event loadedmetadata fired but dimensions not ready: 0 x 0
[Video] Event fired: canplay | readyState: 2 | dimensions: 1920 x 1080
[Video] ✅ Loaded successfully: 1920 x 1080
```

**原因**: 正常（複数のイベントでフォールバック）

**対処法**: 問題なし。`canplay`または`canplaythrough`で成功

---

### **パターン5: MediaPipe初期化が失敗**

**ログ**:
```
[Video] ✅ Loaded successfully: 1920 x 1080
[Video] Promise resolved - video loaded
[Video] Initializing MediaPipe for first time...
[MediaPipe] Initializing...
[MediaPipe] Loading vision tasks...
❌ [MediaPipe] Initialization error: ...
```

**原因**: 
- ネットワーク接続の問題
- MediaPipe CDNが利用不可
- ブラウザが古い

**対処法**:
1. インターネット接続を確認
2. ブラウザを最新版に更新
3. Chrome/Edgeブラウザを使用

---

## 📝 ログを共有する際の注意点

問題が解決しない場合、以下の情報を共有してください:

1. **コンソールログ全体**（スクリーンショットまたはコピー）
2. **エラーメッセージ**（赤文字で表示されるメッセージ）
3. **ブラウザの種類とバージョン**（例: Chrome 120, Firefox 121）
4. **動画ファイル情報**:
   - ファイルサイズ（MB）
   - ファイル形式（.mp4, .webm等）
   - 長さ（秒）
5. **動作**:
   - 1回目: ○○が表示される
   - 2回目: ○○が表示される

---

## 🚀 修正内容まとめ

### **追加したデバッグログ**:
1. ✅ loadVideoFile()の各ステップで詳細ログ
2. ✅ イベント名とreadyState、dimensionsを表示
3. ✅ 解決済みフラグで重複イベントを検出
4. ✅ input.click()の成功/失敗を確認
5. ✅ MediaPipe初期化の各ステップで詳細ログ
6. ✅ GPU/CPU delegateの成功/失敗を表示

### **期待される効果**:
- 問題の特定が容易になる
- ユーザーが自己解決できる
- サポートが効率的になる

---

## 🌐 アクセスURL
https://3000-ila4jz8gkep72kqqr1ser-583b4d74.sandbox.novita.ai

---

**次のステップ**: 
1. スーパーリロード（Ctrl+Shift+R / Cmd+Shift+R）
2. コンソールを開く（F12）
3. 動画をアップロード
4. ログを確認
5. 問題が残る場合は、ログを共有してください！
