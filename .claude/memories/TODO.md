# TODO: 次のステップ

## 優先度: 高

### ~~FBXモデルの導入~~ — 完了
- ms07_Wildboar（イノシシ）モデル+11アニメーション+6テクスチャを導入済
- 詳細: [fbx-integration.md](fbx-integration.md)

### タイマー設定カスタマイズUI
- 現在は25分/5分固定
- 作業時間・休憩時間をユーザーが変更できるUIを追加
- `TimerConfig` は既にカスタム値対応済み（`createConfig(workMs, breakMs)`）
- 長時間休憩（4サイクルごとに15分等）の対応も検討

### アプリアイコン
- 現在はデフォルトのElectronアイコン
- 256x256以上のPNGを作成し、.icoに変換
- `package.json` の `build.win.icon` に指定

## 優先度: 中

### Steam連携
- `steamworks.js` パッケージを追加
- Steamworks開発者登録（$100 USD/タイトル）
- AppID取得後、`desktop/main/index.ts` で初期化
- 実績（Achievement）の設計と実装
  - 例: 初回ポモドーロ完了、10サイクル達成、全環境音を試す、等
- Steam Overlay有効化: `require('steamworks.js').electronEnableSteamOverlay()`

### キャラクターの表情・感情表現の拡張
- 現在の行動パターン（7状態）に加えて感情パラメータを追加
- タイマー状態や操作に応じて感情が変化
- 例: 長時間作業→疲れ顔、ドラッグしすぎ→怒り、休憩完了→元気

### 環境シーンのバリエーション
- 現在は固定の森シーンのみ
- シーンプリセット追加: 海辺、都市の公園、宇宙、部屋の中、等
- UIで切替可能にする
- `EnvironmentBuilder` を抽象化してプリセットごとの実装に分離

### 環境映像（背景動画）
- 要件定義でnice-to-haveとされた機能
- Three.jsのVideoTextureで背景に動画を投影
- または360度パノラマ画像をSkyboxとして使用
- フリー素材: Pexels, Pixabay等

## 優先度: 低

### 通知機能
- フェーズ完了時にシステム通知を発行
- Electron `Notification` API使用
- 音声通知（ベル音等）も併用

### 統計・履歴
- 完了したポモドーロ数を日/週/月で記録
- LocalStorageまたはファイルベースで永続化
- 簡易グラフ表示

### キーボードショートカット
- Space: Start/Pause トグル
- R: Reset
- 1-4: 環境音プリセット切替
- M: ミュートトグル
- Electron `globalShortcut` でウィンドウ非アクティブ時も対応

### マルチプラットフォーム
- 現在はWindows向けのみ
- macOS: electron-builderの `mac.target` 追加
- Linux: AppImage or deb
- Tauriへの移行検討（Steam不要の場合、バイナリサイズ大幅削減）

### プロンプト解釈のLLM化
- 現在はキーワードマッチング
- ローカルLLM（llama.cpp等）やAPI（Claude等）で自然言語解釈
- 「ちょっと疲れた」→sleep、「元気出して」→happy のような曖昧な入力に対応
- コスト・レイテンシ・オフライン対応のトレードオフを検討
