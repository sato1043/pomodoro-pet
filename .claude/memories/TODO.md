# TODO: 次のステップ

## 優先度: 高

### ~~AppMode（アプリケーションモード）の導入~~ — 完了
- `free`（ポモドーロしていない）と `pomodoro`（ポモドーロ中）の2モードを管理
- アプリケーション層に `AppModeManager` を配置
- CycleCompleted時の自動遷移、UIモード切替、キャラクター連携を実装
- 詳細: [app-mode-design.md](app-mode-design.md)

### ~~FBXモデルの導入~~ — 完了
- ms07_Wildboar（イノシシ）モデル+11アニメーション+6テクスチャを導入済
- 詳細: [fbx-integration.md](fbx-integration.md)

### ~~キャラクター固定 + 無限スクロール背景~~ — 完了
- キャラクターを画面中央に固定、wander時に背景が無限スクロール
- チャンクベースのリサイクル方式（3チャンク）
- ドラッグはY軸摘まみ上げに変更
- SceneConfig（進行方向+スクロール設定）とChunkSpec（チャンク仕様）を導入

### ~~タイマー設定カスタマイズUI~~ — 完了
- TimerOverlayのfreeモードにボタングループで設定（Work [25/50/90], Break [5/10/15], Long Break [15/30/60], Sets [1/2/3/4]）
- サウンド設定（プリセットボタン＋10段階ボリュームインジケーター＋SVGミュートボタン）もTimerOverlayに統合
- ☰/×トグルで設定行を折りたたみ、折りたたみ時はサマリー（W/B/L/S）＋ボリュームインジケーターを表示
- SettingsPanelはギアアイコン→モーダルでEnvironment設定（スタブ）のみ
- `AppSettingsService`が分→ms変換＋バリデーション＋`SettingsChanged`イベント発行
- `SettingsChanged`購読でsession再作成→TimerOverlay再構築のフロー実装
- pomodoroモード中はギアアイコン・トグルボタン非表示
- `createDefaultConfig(debug)`でデバッグ/通常モードを統一管理

### ポモドーロ中のタイマー表示の視認性向上
- 現在work/break/long-breakのフェーズ区別が目立たない
- フェーズ別の色分け（例: work=赤系、break=緑系、long-break=青系）を検討
- サイクル・セット表示がタイマーより概念的に上位にも関わらず小さく目立たない
- 情報の階層構造を視覚的に反映する（サイクル/セット → フェーズ → 残り時間）
- タイマー進捗をビジュアルに直感把握できるようにする（円形プログレス、バー等のアナログ表現）
- デジタル表示（残り時間数値）とアナログ表示の併記を検討
- フォントサイズ、コントラスト、配置の最適化も検討

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

### モデルに餌をあげる
- キャラクター（イノシシ）に餌をあげるインタラクション機能
- UIに餌ボタンを追加、またはドラッグ＆ドロップで餌を与える操作
- 餌を与えると専用アニメーション（食べる動作）を再生
- 餌やり後に感情変化（happy状態への遷移など）
- BehaviorStateMachineに `feeding` 状態の追加を検討

### 環境シーンのバリエーション
- 無限スクロール背景基盤（InfiniteScrollRenderer + EnvironmentChunk）は実装済み
- ChunkSpecを差し替えることでオブジェクト構成を変更可能
- シーンプリセット追加: 海辺、都市の公園、宇宙、部屋の中、等
- UIで切替可能にする
- `EnvironmentChunk` のオブジェクト生成ロジックをプリセットごとに分離

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
