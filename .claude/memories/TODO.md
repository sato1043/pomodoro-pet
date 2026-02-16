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
- ☰/×トグルで設定行を畳み、タイムラインサマリー（CyclePlanベース横棒グラフ＋AM/PM時刻＋合計時間）に切替
- デフォルト折りたたみ。展開時はSetボタンで確定（スナップショット/リストア）
- 折りたたみ時のボリューム/ミュート変更は即時保存
- SettingsPanelはギアアイコン→モーダルでEnvironment設定（スタブ）のみ
- `AppSettingsService`が分→ms変換＋バリデーション＋`SettingsChanged`/`SoundSettingsLoaded`イベント発行
- `SettingsChanged`購読でsession再作成→TimerOverlay再構築のフロー実装
- pomodoroモード中はギアアイコン・トグルボタン非表示
- `parseDebugTimer(spec)`でVITE_DEBUG_TIMERの秒数指定をパース

### ~~CyclePlan（フェーズ順列の一元管理）~~ — 完了
- `buildCyclePlan(config)`がTimerConfigからCyclePhase[]を生成する値オブジェクト
- PomodoroSessionがCyclePlanをインデックス走査する方式に変更
- Sets=1はBreak、Sets>1の最終セットはLong Break
- デフォルトSets=1に変更
- TimerOverlayのタイムラインサマリーもCyclePlanを利用

### ~~設定永続化~~ — 完了
- タイマー設定＋サウンド設定を`{userData}/settings.json`にJSON永続化
- Node.js標準API（`fs` + `app.getPath('userData')`）で直接読み書き（electron-storeはESM/CJS衝突のため不採用）
- Electron IPC（`settings:load`/`settings:save`）→ preload contextBridge → renderer
- 起動時に`loadFromStorage()`で復元（サウンド→タイマーの順でイベント発行）

### ~~SFX通知音（ファンファーレ・テストサウンド）~~ — 完了
- `SfxPlayer`（インフラ層）: MP3ワンショット再生。fetch+decodeAudioData+バッファキャッシュ
- `TimerSfxBridge`（アプリケーション層）: PhaseCompleted(work)でwork完了音、AppModeChanged(congrats)でファンファーレを再生。`TimerSfxConfig`で各URLを個別指定可能
- `VolumeControl`（アダプター層）: TimerOverlayからボリューム関連UIを共通コンポーネント化。ボリューム変更/ミュート解除時にテストサウンド(`/audio/test.mp3`)を再生
- MP3ファイルは`assets/audio/`に配置（Vite publicDir経由で`/audio/`としてアクセス）
- `work-complete.mp3`は未配置（配置すればwork完了時に再生される）

### ~~休憩BGM再生~~ — 完了
- break/long-break開始時に環境音を停止し`break-chill.mp3`をループ再生
- 残り30秒で`break-getset.mp3`にクロスフェード切替（3秒、PhaseTimeTriggerを活用）
- ループ境界・曲間切替でクロスフェード（per-source GainNodeで個別フェード制御）
- break/long-break終了時にBGM停止・環境音復帰
- pause時はBGM停止、resume時はPhaseStarted再発行で自動復帰
- `SfxPlayer`に`playLoop(url)`/`stop()`を追加（インフラ層）
- `TimerSfxBridge`に`AudioControl`インターフェース導入で環境音制御を抽象化（アプリケーション層）
- `main.ts`で`BREAK_BGM_TRIGGERS`（PhaseTriggerMap）をsession作成時に注入

### ~~ポモドーロ中のタイマー表示の視認性向上~~ — 完了
- SVG円形プログレスリング（200px、r=90、stroke-width=12）でタイマー進捗をアナログ表現
- フェーズラベル＋タイマー数字をリング内側に配置
- タイマー数字にフェーズカラーを適用（work=緑、break=青、long-break=紫）
- 背景ティント: オーバーレイ全体に下→上グラデーション、時間経過で濃くなる（alpha 0.04→0.24）
- 左肩にサイクル進捗ドット（フェーズ単位、完了=白、現在=フェーズカラー、未到達=半透明）
- pomodoro中はタイトル「Pomodoro Pet」非表示、pause/stopアイコンをタイトル行の右肩に配置
- 不要な要素を削除: Set情報、flowテキスト、progressドット、タイムラインバー（pomodoro中）

### ~~ポモドーロ完了時のコングラチュレーション表示~~ — 完了
- AppModeに`congrats`シーンを追加（free → pomodoro → congrats → free）
- CycleCompleted時にcongratsシーンへ自動遷移、祝福メッセージ＋紙吹雪エフェクト表示
- 5秒で自動dismiss、またはクリックで閉じてfreeモードに遷移
- キャラクターhappyアニメーション連動、サイクル完了ファンファーレ再生
- work完了音とサイクル完了ファンファーレのURL分離（`work-complete.mp3`は未配置、配置すれば有効化）
- 詳細: [app-mode-design.md](app-mode-design.md)

### ~~アプリアイコン~~ — 完了
- `build/icon.png`（512x512 RGBA）から`npm run icon`でマルチサイズICO生成（要ImageMagick）
- サイズ別シャープニング適用（256px:0.5 → 16px:2.0）
- `package.json`の`build.win.icon`に`build/icon.ico`を設定済み
- タスクバー（32x32）での視認性に限界あり。改善には小サイズ用の簡略化デザインが必要

### ~~ポモドーロタイマーの操作ボタン整理~~ — 完了
- Pause/Resumeボタン削除 → 右肩SVGアイコン（❚❚/▶）に置換
- Exitボタン削除 → 右肩SVG停止アイコン（■）に置換（控えめ表示、誤操作防止）
- `PomodoroAborted`/`PomodoroCompleted`ドメインイベントを新設し、手動中断時に`pomodoro-exit.mp3`を再生
- 起動時の音量設定復元・AudioAdapter初期値ミュート化

### シーンチェンジ演出
- free↔pomodoro等のAppScene遷移時に表示上の演出を挟む仕組みを導入する
- 映画的なシーンチェンジ（暗転、フェードイン/アウト等）を可能にする
- まずは暗転（フェードアウト→フェードイン）のみ実装する
- AppScene遷移だけでなくwork↔breakのフェーズ切替にも適用できるよう汎用化する
- 映像演出と効果音演出を統合管理する設計を検討する
  - 特定の演出では映像のみ・効果音のみの定義でもよいが、基盤としては統合されているほうが有意義
  - 例: 暗転（映像のみ）、ファンファーレ（音のみ）、congrats（映像+音）など一元的に扱える

### メインプロセスのESM化検討
- 現在`externalizeDepsPlugin()`がCJS出力するため、ESM専用パッケージ（electron-store v9+等）が使えない
- Electron v28+はメインプロセスのESMをサポート済み（現在v33）
- 変更箇所:
  - `package.json`に`"type": "module"`追加
  - `electron.vite.config.ts`で`build.rollupOptions.output.format: 'es'`設定
  - `desktop/main/index.ts`の`__dirname`を`import.meta.url` + `fileURLToPath`に書き換え
  - `desktop/preload/index.ts`はCJSのまま維持（contextBridgeの制約）
- メリット: ESM専用パッケージの利用、top-level await、renderer側との統一
- リスク: preloadとの境界整理、electron-viteのESM出力の安定性

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

### チャットUIの改善
- 現在のPromptInputは単純なテキスト入力＋Sendボタンのみ
- 会話履歴の表示（キャラクターの応答・行動結果のフィードバック）
- 吹き出し風UIでキャラクターとの対話感を演出
- 入力候補・コマンドパレット（スラッシュコマンドやサジェスト）
- ポモドーロ中のインタラクションロック時に入力不可状態を視覚的に表示
- キャラクターの状態や感情に応じた応答メッセージの生成
- モバイル/小画面対応（レスポンシブレイアウト）

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
