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
- OverlayFreeのfreeモードにボタングループで設定（Work [25/50/90], Break [5/10/15], Long Break [15/30/60], Sets [1/2/3/4]）
- サウンド設定（プリセットボタン＋10段階ボリュームインジケーター＋SVGミュートボタン）もOverlayFreeに統合
- ☰/×トグルで設定行を畳み、タイムラインサマリー（CyclePlanベース横棒グラフ＋AM/PM時刻＋合計時間）に切替
- デフォルト折りたたみ。展開時はSetボタンで確定（スナップショット/リストア）
- 折りたたみ時のボリューム/ミュート変更は即時保存
- SettingsPanelはギアアイコン→モーダルでEnvironment設定（スタブ）のみ → React化時に削除済み
- `AppSettingsService`が分→ms変換＋バリデーション＋`SettingsChanged`/`SoundSettingsLoaded`イベント発行
- `SettingsChanged`購読でsession再作成→UI再構築のフロー実装
- pomodoroモード中はギアアイコン・トグルボタン非表示
- `parseDebugTimer(spec)`でVITE_DEBUG_TIMERの秒数指定をパース

### ~~CyclePlan（フェーズ順列の一元管理）~~ — 完了
- `buildCyclePlan(config)`がTimerConfigからCyclePhase[]を生成する値オブジェクト
- PomodoroSessionがCyclePlanをインデックス走査する方式に変更
- Sets=1はBreak、Sets>1の最終セットはLong Break
- デフォルトSets=1に変更
- OverlayFreeのタイムラインサマリーもCyclePlanを利用

### ~~設定永続化~~ — 完了
- タイマー設定＋サウンド設定を`{userData}/settings.json`にJSON永続化
- Node.js標準API（`fs` + `app.getPath('userData')`）で直接読み書き（electron-storeはESM/CJS衝突のため不採用）
- Electron IPC（`settings:load`/`settings:save`）→ preload contextBridge → renderer
- 起動時に`loadFromStorage()`で復元（サウンド→タイマーの順でイベント発行）

### ~~SFX通知音（ファンファーレ・テストサウンド）~~ — 完了
- `SfxPlayer`（インフラ層）: MP3ワンショット再生。fetch+decodeAudioData+バッファキャッシュ
- `TimerSfxBridge`（アプリケーション層）: PhaseCompleted(work)でwork完了音、AppModeChanged(congrats)でファンファーレを再生。`TimerSfxConfig`で各URLを個別指定可能
- `VolumeControl`（アダプター層）: ボリューム関連UIを共通コンポーネント化。ボリューム変更/ミュート解除時にテストサウンド(`/audio/test.mp3`)を再生
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

### ~~シーンチェンジ演出~~ — 完了
- 宣言的シーン遷移グラフ（`DISPLAY_SCENE_GRAPH`）で全遷移ルールをテーブル定義
- `DisplayScene`型（AppScene+PhaseTypeの結合キー）で5つの表示シーンを定義
- `DisplayTransitionState`によるテーブルルックアップで遷移効果を解決
- `SceneTransition`による全画面暗転オーバレイ（350ms フェードアウト→モード切替→350ms フェードイン）
- SceneRouter（AppSceneChanged購読）とOverlayPomodoro（PhaseStarted購読）のコンポーネント分離により、同期バッチイベントを自然に処理
- free→pomodoro、break/long-break→work、congrats→free: blackout。work→break/long-break/congrats: immediate（暗転なし）
- 将来拡張: `TransitionEffect`にcrossfade/wipe追加、`TransitionRule`にaudioフィールド追加で映像+音声統合管理
- 詳細: [scene-transition-design.md](scene-transition-design.md)

### ~~UI層のReact化~~ — 完了
- 全UIコンポーネントを命令型DOM操作（`.ts`）からReact JSX（`.tsx`）に移行
- `App.tsx`/`AppContext.tsx`（依存注入）/`useEventBus` hookを新規追加
- CSSを`overlay.css.ts`に分離
- `createPortal`でdocument.bodyにポータル化（旧DOM構造を再現）
- 全テキスト文字アイコン（☰⚙×等）をインラインSVGコンポーネントに統一
- `dangerouslySetInnerHTML`を排除（Reactイベント委譲の不具合を解消）
- 未実装スタブのSettingsPanelを削除
- sfxPlayer音量・ミュート同期を復元、pointerEvents透過を修正

### ~~ReactコンポーネントのCSS方式改善 — vanilla-extract導入~~ — 完了
- `@vanilla-extract/css` + `@vanilla-extract/vite-plugin` を導入
- `theme.css.ts`にテーマコントラクト定義（`createThemeContract`）、ライト/ダークテーマ値を定義
- 全7コンポーネントを個別`.css.ts`ファイルに移行（overlay, free-timer-panel, pomodoro-timer-panel, congrats-panel, scene-transition, volume-control, prompt-input）
- PromptInputのインラインスタイルを`.css.ts`に移行（擬似クラス対応）
- フェーズカラー等の動的スタイルはCSS変数（`vars`）経由でテーマ連動

### ~~通知機能~~ — 完了
- バックグラウンド時にElectron `Notification` APIでシステム通知を発行（フォアグラウンド時は発行しない）
- BG Audio（バックグラウンドオーディオ）とBG Notify（バックグラウンド通知）の2つの独立設定で挙動を制御
- `NotificationBridge`（アプリケーション層）がEventBus購読→通知発行判定。`NotificationPort`でElectron APIを抽象化
- `TimerSfxBridge`に`shouldPlayAudio`コールバック追加でバックグラウンド時のオーディオ抑制
- `AudioAdapter`/`SfxPlayer`に`setBackgroundMuted()`追加（ユーザーミュートと独立管理）
- blur/focusイベントでバックグラウンド検出（`document.hasFocus()`はElectronで信頼できないため）
- バックグラウンド時はsetInterval(1秒)でタイマー継続（rAFはバックグラウンドで停止するため）
- FreeTimerPanelのSetボタン直下に「In Background: [🔊] [🔔]」アイコントグルを配置
- `app.setAppUserModelId()`を`__APP_ID__`（electron-vite define埋め込み）で設定（Windows通知に必須）
- 設定はsettings.jsonに永続化（`background.backgroundAudio`/`background.backgroundNotify`）

### ~~統計・履歴~~ — 完了
- フェーズ単位で日次集計（DailyStats: work/break完了数、累計時間、サイクル完了/中断数）
- `{userData}/statistics.json`にファイルベース永続化（settings.jsonとは別ファイル）
- Electron IPC（`statistics:load`/`statistics:save`）→ preload contextBridge → renderer
- `StatisticsService`（アプリケーション層）がCRUD+永続化。`StatisticsBridge`がEventBus購読→統計記録
- `StatsDrawer`（UIアダプター層）: サマリー3カード（Today/7Days/30Days）、13週カレンダーヒートマップ（SVG、work完了数5段階）、累計(work+break)時間折れ線グラフ（SVG、最終点に脈動アニメーション付き）
- FreeTimerPanel右上にチャートアイコンで統計ドロワーを切替表示

## 優先度: 中

### ~~ふれあいモード Phase 1: シーン枠組み~~ — 完了
- free / pomodoro と同格の第3のAppScene `fureai` を追加
- `FureaiCoordinator`（アプリケーション層）がシーン遷移+プリセット切替を協調
- `fureai-idle` BehaviorPreset（autonomousからsleep遷移を除外）
- コンパクトオーバーレイ（タイトル+時計+戻るボタン）でキャラクターとのふれあい空間を確保
- 画面左下のキャベツアイコンボタンでfreeからfureaiに遷移
- free ↔ fureai（blackout）、fureai → pomodoro / pomodoro → fureai は禁止

### ~~ふれあいモード Phase 2: 餌やり機能~~ — 完了
- キャベツ3Dオブジェクト（CabbageObject）のドラッグ＆ドロップによる餌やり
- feeding状態（sitアニメ代用、3-5秒）追加、fureai-idleプリセットでfeeding→happy遷移
- FeedingInteractionAdapter（キャベツD&D、距離判定、スナップバック）
- FureaiCoordinatorにfeedCharacter()とFeedingAdapter活性化制御
- HeartEffect（SVGハートパーティクル、floatUpアニメーション）
- FeedingSuccessイベント（EventBus）でUI通知

### キャラクターの表情・感情表現の拡張
- 現在の行動パターン（7状態）に加えて感情パラメータを追加
- タイマー状態や操作に応じて感情が変化
- 例: 長時間作業→疲れ顔、ドラッグしすぎ→怒り、休憩完了→元気

### ~~モデルに餌をあげる~~ — 完了（ふれあいモード Phase 2 で実装）
- キャベツ3Dオブジェクトのドラッグ＆ドロップで餌やり
- feeding状態（BehaviorStateMachine）→ happy遷移 → ハートエフェクト

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

### プロンプト解釈のLLM化
- 現在はキーワードマッチング
- ローカルLLM（llama.cpp等）やAPI（Claude等）で自然言語解釈
- 「ちょっと疲れた」→sleep、「元気出して」→happy のような曖昧な入力に対応
- コスト・レイテンシ・オフライン対応のトレードオフを検討

### About画面の作成
- ライセンス表記
- 利用規約
- 必要ならプライバシーポリシー

## 優先度: 低

### Steam連携
- `steamworks.js` パッケージを追加
- Steamworks開発者登録（$100 USD/タイトル）
- AppID取得後、`desktop/main/index.ts` で初期化
- 実績（Achievement）の設計と実装
  - 例: 初回ポモドーロ完了、10サイクル達成、全環境音を試す、等
- Steam Overlay有効化: `require('steamworks.js').electronEnableSteamOverlay()`

### ~~キーボードショートカット~~ — 不採用
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

### 配布準備
- 正しい `build.appId` / `AppUserModelId` の取得と設定
- コード署名証明書の取得・設定
- 自動アップデート（electron-updater）の導入検討
- インストーラーのカスタマイズ（NSIS設定、ライセンス表示等）

### 素材ライセンス整理・配布方式の決定
- 全購入素材のライセンス条項を確認し一覧化する
- 各素材の「バイナリ同梱配布」可否を確定する
- GitHubリポジトリの構成方式を決定する（プライベートストレージ/submodule/リリースバイナリのみ）
- プレースホルダーアセットを用意し、素材なしでもビルドが通るようにする
- THIRD_PARTY_LICENSESファイル・EULA・クレジット表記を整備する
- 詳細: [asset-licensing-distribution.md](asset-licensing-distribution.md)
