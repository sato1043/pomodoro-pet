# アーキテクチャ

## レイヤー構成（クリーンアーキテクチャ）

```
domain（最内層）← application ← adapters ← infrastructure（最外層）
```

依存方向: 外→内のみ。domainは他の層を知らない。

## 階層的状態マシン

4層の階層的状態マシンでアプリケーション状態を管理する。

```
Layer 1: AppScene          — free | pomodoro | settings | fureai
Layer 2: PomodoroState     — work | break | long-break | congrats （+ running）
Layer 3: CharacterBehavior — autonomous | march-cycle | rest-cycle | joyful-rest | celebrate | fureai-idle
Layer 4: CharacterState    — idle | wander | march | sit | sleep | happy | ...
```

詳細: [pomodoro-state-transitions.md](pomodoro-state-transitions.md)

## モジュール間通信

PomodoroOrchestratorが階層間連動を直接コールバックで管理。EventBusはUI/インフラへの通知のみ。

### 通信パターン

```
直接呼び出し（PomodoroOrchestrator内部）:
  AppSceneManager.enterPomodoro/exitPomodoro（シーン遷移）
  PomodoroStateMachine.start/tick/pause/reset（タイマー操作）
  onBehaviorChange callback（キャラクター行動切替）

EventBus（UI/インフラ通知）:
  AppSceneChanged → SceneRouter
  PhaseStarted/TimerTicked/TimerPaused/TimerReset → OverlayPomodoro
  PhaseCompleted(work)/PhaseStarted(congrats) → TimerSfxBridge
  TriggerFired(break-getset/long-break-getset) → TimerSfxBridge（休憩BGM切替）
  PomodoroAborted → TimerSfxBridge（exit音再生）
  PhaseCompleted(work/break)/PomodoroCompleted → NotificationBridge（バックグラウンド通知）
  PhaseCompleted(work/break/long-break)/PomodoroCompleted/PomodoroAborted → StatisticsBridge（統計記録）
  FeedingSuccess → SceneFureai（ハートエフェクト発火）、main.ts（EmotionService fed + InteractionTracker recordFeeding）
  PomodoroCompleted/PomodoroAborted → main.ts（EmotionService pomodoro_completed/pomodoro_aborted）
  SettingsChanged → main.ts（session/Orchestrator/UI再作成）
  SoundSettingsLoaded → main.ts（AudioAdapter適用）
  BackgroundSettingsLoaded → main.ts（バックグラウンド設定適用）
```

## 5つのドメインコンテキスト

### 1. タイマー
- `PomodoroStateMachine` — `CyclePlan`をインデックス走査する方式。`PomodoroState`判別共用体型で状態を表現。`exitManually()`でcongrats中以外の手動終了。デフォルト1セット/サイクル。サイクル完了自動停止。`PomodoroStateMachineOptions`でPhaseTimeTriggerを注入可能
- `CyclePlan` — `buildCyclePlan(config)`がTimerConfigからフェーズ順列（CyclePhase[]）を生成する値オブジェクト。最終workの直後にcongrats（5秒）を挿入し、最終休憩（Sets=1はBreak、Sets>1はLong Break）で終了
- `TimerPhase` — work / break / long-break / congrats の4フェーズ
- `TimerConfig` — 作業時間、休憩時間、長時間休憩時間、セット数
- `PhaseTrigger` — PhaseTimeTrigger型定義。`TriggerTiming`（elapsed/remaining）と`PhaseTriggerSpec`（id+timing）。`PhaseTriggerMap`で全フェーズのトリガーを定義。break/long-breakの残り30秒でgetsetトリガーを発行（休憩BGM切替に使用）
- `TimerEvents` — PhaseStarted, PhaseCompleted, SetCompleted, CycleCompleted, TimerTicked, TimerPaused, TimerReset, TriggerFired

### 2. キャラクター
- `Character` — 位置・状態管理
- `BehaviorStateMachine` — 11状態のステートマシン。BehaviorPresetで宣言的に振る舞いを制御。`applyPreset()`で遷移テーブル・スクロール・インタラクションロックを一括切替。`InteractionKind`に`feed`を含む。`previousState`で直前の状態を追跡。`tick(deltaMs, phaseProgress?)`でmarch速度をphaseProgressに連動（1.5→2.5加速）
- `BehaviorPreset` — 6種のプリセット定義（autonomous/march-cycle/rest-cycle/joyful-rest/celebrate/fureai-idle）。`durationOverrides`でプリセット別に状態の持続時間を上書き可能（march-cycle: march 30〜60秒、idle 3〜5秒）。`fureai-idle`はautonomousからsleep遷移を除外+feeding→happy遷移を定義
- `CharacterState` — 11状態設定（idle/wander/march/sit/sleep/happy/reaction/dragged/pet/refuse/feeding）。アニメーション名、持続時間範囲、ループ有無
- `GestureRecognizer` — ドラッグ/撫でるジェスチャー判定
- `AnimationResolver` — コンテキスト依存アニメーション選択のインターフェース。`AnimationContext`（state/previousState/presetName/phaseProgress/emotion/interaction/timeOfDay/todayCompletedCycles）→`AnimationSelection`（clipName/loop/speed）。`createDefaultAnimationResolver()`はSTATE_CONFIGS準拠のフォールバック
- `EnrichedAnimationResolver` — 16ルールのアニメーション選択。march終盤run/march中盤速め/疲労歩き/満腹拒否/食べ過ぎ拒否/連打怒り/苛立ち/夜眠そう/生産的happy/リアクション変種/拒否変種/起き上がり/祝賀走り/なつきhappy。ルールはファクトリ関数で個別生成（テスト容易性のためrandom関数を注入可能）
- `InteractionTracker` — クリック回数（3秒スライディングウィンドウ）と餌やり回数の追跡。`InteractionHistory`型で`recentClicks`/`totalFeedingsToday`を公開
- `EmotionState` — 感情パラメータ値オブジェクト（satisfaction/fatigue/affinity、各0.0〜1.0）。`applyEmotionEvent()`でイベント効果を適用、`tickEmotion()`で自然変化（work中fatigue増加、非work時回復・satisfaction減衰、affinity緩やか減衰）。affinityのみ永続化

### 3. 環境
- `SceneConfig` — 進行方向、スクロール速度、状態別スクロール有無
- `ChunkSpec` — チャンク寸法（幅・奥行き）とオブジェクト配置数（木・草・岩・花）
- `shouldScroll()` — 現在の状態でスクロールすべきか判定する純粋関数
- `SceneObject` — シーンオブジェクト型定義
- `WeatherConfig` — 天気設定値オブジェクト（WeatherType, TimeOfDay, CloudDensityLevel 0-5, autoTimeOfDay）。`createDefaultWeatherConfig()`, `resolveTimeOfDay(hour)`, `cloudPresetLevel(weather)`
- `EnvironmentThemeParams` — 描画パラメータ（空色・霧・ライト・地面色・露出）。`resolveEnvironmentTheme(weather, timeOfDay)`で20パターンルックアップ

### 4. 統計
- `StatisticsTypes` — DailyStats型（日次集計）、emptyDailyStats()、todayKey()、formatDateKey()ヘルパー。StatisticsData型（Record<'YYYY-MM-DD', DailyStats>）

### 5. 共有
- `EventBus` — Pub/Subイベントバス。タイマーとキャラクター間を疎結合に連携

## ファイルマップ

### desktop/ — Electronプロセス
- `main/index.ts` — メインプロセス（BrowserWindow生成、dev/prod切替、SwiftShaderフォールバック、DevTools環境変数制御、設定永続化IPC、`notification:show` IPCハンドラ、`statistics:load`/`statistics:save` IPCハンドラ、`about:load` IPCハンドラ）。`__APP_ID__`（ビルド時define埋め込み）で`app.setAppUserModelId()`を設定（Windows通知に必須）
- `preload/index.ts` — contextBridge（platform, loadSettings, saveSettings, showNotification, loadStatistics, saveStatistics, loadAbout公開）

### src/domain/ — ドメインモデル
- `timer/entities/PomodoroStateMachine.ts` — タイマー中核ロジック（CyclePlanインデックス走査方式、PomodoroState型、exitManually、PhaseTimeTrigger対応、phaseProgressゲッター）
- `timer/value-objects/CyclePlan.ts` — フェーズ順列生成（buildCyclePlan, cycleTotalMs, CONGRATS_DURATION_MS）
- `timer/value-objects/TimerPhase.ts` — work/break/long-break/congratsフェーズ
- `timer/value-objects/PhaseTrigger.ts` — PhaseTimeTrigger型定義（TriggerTiming, PhaseTriggerSpec, PhaseTriggerMap）
- `timer/value-objects/TimerConfig.ts` — 設定（デフォルト25分/5分/15分長時間休憩/1セット）。`parseDebugTimer(spec)`でVITE_DEBUG_TIMERの秒数指定（`work/break/long-break/sets`）をパース
- `timer/events/TimerEvents.ts` — イベント型定義
- `character/entities/Character.ts` — キャラクターエンティティ
- `character/services/BehaviorStateMachine.ts` — 行動AIステートマシン（BehaviorPreset対応、fixedWanderDirection対応、previousState追跡、phaseProgress連動march速度）
- `character/services/AnimationResolver.ts` — AnimationContext/AnimationSelection/AnimationResolverFnインターフェース、createDefaultAnimationResolver
- `character/services/EnrichedAnimationResolver.ts` — 16ルールのコンテキスト依存アニメーション選択（ファクトリ関数方式、random注入可能）
- `character/services/InteractionTracker.ts` — クリック回数（3秒ウィンドウ）・餌やり回数追跡。InteractionHistory型
- `character/value-objects/BehaviorPreset.ts` — 6種のプリセット定義（autonomous/march-cycle/rest-cycle/joyful-rest/celebrate/fureai-idle）
- `character/value-objects/CharacterState.ts` — 11状態定義+設定（feeding追加）
- `character/value-objects/EmotionState.ts` — EmotionState値オブジェクト（satisfaction/fatigue/affinity）。applyEmotionEvent()、tickEmotion()純粋関数
- `character/value-objects/Position3D.ts` — 3D位置
- `environment/value-objects/SceneConfig.ts` — SceneConfig, ChunkSpec, shouldScroll()
- `environment/value-objects/SceneObject.ts` — シーンオブジェクト型
- `environment/value-objects/WeatherConfig.ts` — WeatherConfig, WeatherType, TimeOfDay, CloudDensityLevel, resolveTimeOfDay(), cloudPresetLevel()
- `environment/value-objects/EnvironmentTheme.ts` — EnvironmentThemeParams, resolveEnvironmentTheme()（20パターンルックアップ）
- `statistics/StatisticsTypes.ts` — DailyStats型、StatisticsData型、emptyDailyStats()、todayKey()、formatDateKey()
- `shared/EventBus.ts` — Pub/Subイベントバス

### src/application/ — ユースケース
- `app-scene/AppScene.ts` — AppScene型定義（free/pomodoro/settings/fureai）とAppSceneEvent型
- `app-scene/AppSceneManager.ts` — アプリケーションシーン管理（enterPomodoro/exitPomodoro/enterFureai/exitFureai）。純粋な状態ホルダー（EventBus不要）
- `fureai/FureaiCoordinator.ts` — ふれあいモードのシーン遷移+プリセット切替+餌やり制御を協調。enterFureai()でfureai-idleプリセット+FeedingAdapter活性化、exitFureai()でautonomousプリセット+FeedingAdapter非活性化。feedCharacter()でfeeding状態遷移。PomodoroOrchestratorとは独立
- `app-scene/DisplayTransition.ts` — 宣言的シーン遷移グラフ。DisplayScene型（AppScene+PhaseTypeの結合キー）、DISPLAY_SCENE_GRAPH定数（遷移ルールテーブル）、DisplayTransitionState（テーブルルックアップ状態管理）、toDisplayScene()変換ヘルパー
- `settings/AppSettingsService.ts` — タイマー設定＋サウンド設定＋バックグラウンド設定管理。分→ms変換＋バリデーション＋永続化（Electron IPC経由）。`SettingsChanged`/`SoundSettingsLoaded`/`BackgroundSettingsLoaded`イベント発行。`BackgroundConfigInput`（backgroundAudio/backgroundNotify）でバックグラウンド時のオーディオ再生・通知発行を制御
- `settings/SettingsEvents.ts` — SettingsChanged, SoundSettingsLoaded, BackgroundSettingsLoadedイベント型定義
- `timer/PomodoroOrchestrator.ts` — AppScene遷移+タイマー操作+キャラクター行動を一元管理。階層間連動は直接コールバック、EventBusはUI/インフラ通知のみ。手動中断時に`PomodoroAborted`、サイクル完了時に`PomodoroCompleted`をEventBus経由で発行
- `timer/PomodoroEvents.ts` — ポモドーロライフサイクルイベント型（PomodoroAborted/PomodoroCompleted判別共用体）
- `character/InterpretPromptUseCase.ts` — キーワードマッチング（英語/日本語→行動）
- `character/UpdateBehaviorUseCase.ts` — 毎フレームtick。StateMachine遷移 + AnimationResolver経由のアニメーション選択 + ScrollManager経由で背景スクロール制御。`UpdateBehaviorOptions`でリゾルバ・phaseProgress・emotion・interaction・timeOfDay・todayCompletedCyclesを注入
- `character/EmotionService.ts` — 感情パラメータ管理サービス。tick(deltaMs, isWorking)で自然変化、applyEvent()でイベント適用、loadAffinity()で永続化値復元
- `timer/TimerSfxBridge.ts` — タイマーSFX一元管理。PhaseStarted(work)でwork開始音、PhaseStarted(congrats)でファンファーレ、PhaseStarted(break)でwork完了音（long-break前はスキップする遅延判定）。break/long-break中は`break-chill.mp3`ループ再生、残り30秒で`break-getset.mp3`にクロスフェード切替。`PomodoroAborted`で`pomodoro-exit.mp3`を再生。`AudioControl`で環境音の停止/復帰を制御（EventBus経由）。`shouldPlayAudio`コールバックでバックグラウンド時のオーディオ抑制に対応
- `notification/NotificationBridge.ts` — EventBus購読でバックグラウンド時にシステム通知を発行。PhaseCompleted(work)→「休憩の時間」、PhaseCompleted(break)→「作業の時間」、PomodoroCompleted→「サイクル完了！」。long-break/congratsはスキップ。`NotificationPort`インターフェースでElectron Notification APIを抽象化
- `statistics/StatisticsService.ts` — 日次統計CRUD+永続化サービス。getDailyStats/getRange/addWorkPhase/addBreakPhase/addCompletedCycle/addAbortedCycle。データバリデーション付きload。更新ごとに即座にsaveToStorage
- `statistics/StatisticsBridge.ts` — EventBus購読→StatisticsService更新。PhaseCompleted(work/break/long-break)→addWorkPhase/addBreakPhase、PomodoroCompleted→addCompletedCycle、PomodoroAborted→addAbortedCycle。NotificationBridgeと同パターン
- `environment/ScrollUseCase.ts` — チャンク位置計算・リサイクル判定（Three.js非依存）

### src/adapters/ — UIとThree.jsアダプター
- `three/ThreeCharacterAdapter.ts` — FBX/プレースホルダー統合キャラクター表示。`FBXCharacterConfig`でモデルパス・スケール・テクスチャ・アニメーションを一括設定
- `three/ThreeInteractionAdapter.ts` — Raycasterベースのホバー/クリック/摘まみ上げ（Y軸持ち上げ）/撫でる。`InteractionConfig`で状態別ホバーカーソルをカスタマイズ可能
- `three/FeedingInteractionAdapter.ts` — 餌オブジェクト（キャベツ/リンゴ）のD&D餌やり操作。複数CabbageHandle[]対応。Z平面投影+NDCベースZ制御（べき乗カーブ）。ふれあいモード時カメラ後退。`FeedingSuccess`イベント発行。`isActive`フラグでふれあいモード中のみ動作
- `ui/App.tsx` — Reactルートコンポーネント。`AppProvider`で依存注入し、SceneRouterを配置
- `ui/AppContext.tsx` — `AppDeps`インターフェース定義とReact Context。`useAppDeps()`フックで全依存を取得
- `ui/SceneRouter.tsx` — AppScene切替コーディネーター。`AppSceneChanged`購読でSceneFree/ScenePomodoro/SceneFureaiを切替。シーン間遷移は常にblackout
- `ui/SceneFree.tsx` — freeシーンコンテナ。OverlayFree+StartPomodoroButton+SettingsButton+StatsButton+FureaiEntryButton+StatsDrawer+BackButtonを束ねる。showStats/settingsExpandedで表示切替を管理
- `ui/ScenePomodoro.tsx` — pomodoroシーンコンテナ。OverlayPomodoroを束ねる
- `ui/SceneFureai.tsx` — fureaiシーンコンテナ。OverlayFureai+FureaiExitButton+PromptInput+HeartEffectを束ねる。FeedingSuccess購読でハートエフェクト発火
- `ui/HeartEffect.tsx` — 餌やり成功時のハートパーティクルエフェクト。createPortal+SVGハート+floatUpアニメーション
- `ui/AboutContent.tsx` — About画面（`data-testid="about-content"`）。IPC経由でバージョン情報+THIRD_PARTY_LICENSES.txt取得。PolyForm Noncommercial 1.0.0表示。×ボタンで設定パネルに戻る
- `ui/OverlayFree.tsx` — freeモードオーバーレイ。createPortalでdocument.bodyに描画。タイトル+日付表示。FreeTimerPanelを統合（editor.expandedでFreeSummaryView/FreeSettingsEditor/AboutContentを切替）。showAboutステートで設定パネル内のAbout表示を制御。useSettingsEditorフックでスナップショット/復元を管理
- `ui/OverlayFureai.tsx` — fureaiモードオーバーレイ（`data-testid="overlay-fureai"`）。createPortalでdocument.bodyに描画。コンパクト表示（タイトル+時計）
- `ui/FureaiEntryButton.tsx` — ふれあいモード遷移ボタン。画面左下のリンゴSVGアイコン（`bottom: 232`）。createPortalでdocument.bodyに描画
- `ui/FureaiExitButton.tsx` — ふれあいモードからfreeモードへの戻るボタン。←矢印アイコン。FureaiEntryButtonと同位置
- `ui/StartPomodoroButton.tsx` — Start Pomodoroボタン。画面下部固定（`bottom: 20`）
- `ui/SetButton.tsx` — 設定確定ボタン。StartPomodoroButtonと同位置・同スタイル
- `ui/BackButton.tsx` — 統計パネルからの戻るボタン。StartPomodoroButtonと同位置、キャンセル色
- `ui/SettingsButton.tsx` — 設定パネル展開ボタン。ギアSVGアイコン（`bottom: 112`）
- `ui/StatsButton.tsx` — 統計パネル表示ボタン。チャートSVGアイコン（`bottom: 168`）
- `ui/OverlayPomodoro.tsx` — pomodoroモードオーバーレイ。createPortalでdocument.bodyに描画。`PhaseStarted`購読でwork/break/congrats切替。DisplayTransitionStateでイントラ・ポモドーロ遷移エフェクト解決。背景ティント計算。PomodoroTimerPanel/CongratsPanel描画
- `ui/SceneTransition.tsx` — 暗転レンダリング。全画面暗転オーバーレイ（z-index: 10000）。`playBlackout(cb)`: opacity 0→1 (350ms) → cb() → opacity 1→0 (350ms)。forwardRef+useImperativeHandleで親からの呼び出しに対応。SceneRouter（シーン間）とOverlayPomodoro（イントラ・ポモドーロ）がそれぞれインスタンスを所有
- `ui/StatsDrawer.tsx` — 統計ドロワーパネル。サマリー3カード（Today/7Days/30Days: work完了数+累計時間）、13週カレンダーヒートマップ（SVG、work完了数5段階）、累計(work+break)時間の折れ線グラフ（SVG、最終点に放射状グラデーション脈動アニメーション付き）
- `ui/PomodoroTimerPanel.tsx` — pomodoroモード。SVG円形プログレスリング（200px, r=90, stroke-width=12）でタイマー進捗をアナログ表現。リング内にフェーズラベル＋フェーズカラー数字（work=緑、break=青、long-break=紫）を配置。背景にフェーズカラーの下→上グラデーションティント（時間経過でalpha 0.04→0.24に濃化）。左肩にサイクル進捗ドット、右肩にpause/stopのSVGアイコンボタン。`phaseColor`/`overlayTintBg`純粋関数をexport
- `ui/CongratsPanel.tsx` — congratsモード。祝福メッセージ＋CSS紙吹雪エフェクト
- `ui/VolumeControl.tsx` — サウンドプリセット選択・ボリュームインジケーター・ミュートの共通コンポーネント。ボリューム変更/ミュート解除時にSfxPlayerでテストサウンドを再生。ミュート/ボリューム操作時にAudioAdapter（環境音）とSfxPlayer（SFX）の両方を同期
- `ui/PromptInput.tsx` — プロンプト入力UI
- `ui/hooks/useEventBus.ts` — EventBus購読のReactフック。`useEventBus`（状態取得）、`useEventBusCallback`（コールバック実行）、`useEventBusTrigger`（再レンダリングトリガー）
- `ui/styles/theme.css.ts` — vanilla-extractテーマコントラクト定義（作業中）
- `ui/styles/*.css.ts` — コンポーネント別vanilla-extractスタイル（free-timer-panel, pomodoro-timer-panel, congrats-panel, heart-effect, scene-transition, volume-control, prompt-input, overlay, stats-drawer, fureai-entry, stats-button, settings-button）

### src/infrastructure/ — フレームワーク・ドライバ
- `three/FBXModelLoader.ts` — FBXLoaderラッパー
- `three/AnimationController.ts` — AnimationMixer管理、crossFade、play()にspeed引数対応
- `three/PlaceholderCharacter.ts` — プリミティブ人型キャラクター+13種アニメーション（既存8種+run/attack2/damage1/damage2/getUp）
- `three/CabbageObject.ts` — プリミティブSphereGeometryキャベツ3Dオブジェクト。CabbageHandleインターフェースでposition/visible/reset操作
- `three/AppleObject.ts` — プリミティブ形状リンゴ3Dオブジェクト。CabbageHandleインターフェースを共用。スケール0.15
- `three/EnvironmentBuilder.ts` — 旧・単一シーン環境生成（InfiniteScrollRendererに置換済み）
- `three/EnvironmentChunk.ts` — 1チャンク分の環境オブジェクト生成（ChunkSpecベース、中央帯回避配置、regenerate対応）
- `three/InfiniteScrollRenderer.ts` — 3チャンクの3D配置管理（ScrollState→位置反映、リサイクル時regenerate、霧・背景色設定）。`applyTheme(params)`でEnvironmentThemeParamsに基づく空色・霧・地面色の動的更新
- `three/RainEffect.ts` — 雨エフェクト。LineSegments（650本）残像付き線分 + スプラッシュパーティクル（リングバッファ200個）。WeatherEffectインターフェース定義
- `three/SnowEffect.ts` — 雪エフェクト。Points（750個）sin/cosゆらゆら揺れ
- `three/CloudEffect.ts` — 雲エフェクト。半透明SphereGeometryクラスター、6段階密度（0-100個）、z方向ドリフト
- `audio/ProceduralSounds.ts` — Web Audio APIプロシージャル環境音（Rain/Forest/Wind）
- `audio/AudioAdapter.ts` — 環境音の再生/停止/音量/ミュート管理。`MAX_GAIN=0.25`でUI音量値をスケーリング。初期値はvolume=0/isMuted=true（起動時のデフォルト音量フラッシュ防止）。ミュート時は`AudioContext.suspend()`でシステムリソース（PulseAudioストリーム等）を解放し、解除時に`resume()`で復帰する。`setBackgroundMuted()`でバックグラウンド時のオーディオ抑制に対応（ユーザーミュートとの共存: `updateSuspendState()`で`isMuted || backgroundMuted`を統合判定）
- `audio/SfxPlayer.ts` — MP3ワンショット再生（`play`）およびループ再生（`playLoop`/`stop`）。`crossfadeMs`指定時はループ境界・曲間切替でクロスフェード。per-source GainNodeで個別フェード制御+ファイル別音量補正（`gain`パラメータ）。fetch+decodeAudioData+バッファキャッシュ。`MAX_GAIN=0.25`でUI音量値をスケーリング。ミュート時はループ停止+クロスフェードタイマー解除+`ctx.suspend()`、`play()`/`playLoop()`はミュート中早期リターン。`setBackgroundMuted()`でバックグラウンド時のSFX抑制に対応

**ミュート操作の制約**: VolumeControl（ミュート/音量UIを含む）はOverlayFreeにのみ配置されている。ポモドーロ実行中（work/break/long-break/congrats）にはミュート操作のUIが存在しない。そのためミュート中にフェーズが遷移してBGMのplayLoop呼び出しが早期リターンされるシナリオは発生しない

### src/ — エントリ
- `main.ts` — 全モジュール統合・レンダリングループ。起動時に`loadFromStorage()`で設定・統計データ復元。`SoundSettingsLoaded`でAudioAdapter+SfxPlayerの両方にvolume/mute適用。blur/focusイベントでバックグラウンド検出（`document.hasFocus()`はElectronで信頼できないため）。バックグラウンド時はsetInterval(1秒)でタイマーを継続（rAFはバックグラウンドで停止するため）。NotificationBridge・StatisticsBridge・shouldPlayAudioコールバック・setBackgroundMutedの初期化
- `electron.d.ts` — `window.electronAPI`型定義（platform, loadSettings, saveSettings, showNotification, loadStatistics, saveStatistics, loadAbout）
- `index.html` — HTMLエントリ

### tests/

#### ユニットテスト（Vitest）
ドメイン層とアプリケーション層に集中。Three.js依存のアダプター/インフラ層はテスト対象外。`npm test`で全件実行、`npx vitest run --coverage`でカバレッジレポート生成。

- `domain/timer/PomodoroStateMachine.test.ts` — フェーズ遷移・tick・pause/reset・exitManually・セット進行・congrats・PhaseTimeTrigger
- `domain/timer/CyclePlan.test.ts` — セット構造生成・congrats挿入・Sets=1/複数・cycleTotalMs
- `domain/timer/TimerConfig.test.ts` — デフォルト値・バリデーション・parseDebugTimer書式パース
- `domain/character/BehaviorStateMachine.test.ts` — 全11状態遷移・6プリセット・durationOverrides・プロンプト遷移・tick・keepAlive・isScrollingState・feedインタラクション・feeding→happy遷移チェーン・previousState追跡・march速度phaseProgress連動
- `domain/character/GestureRecognizer.test.ts` — ドラッグ/撫でるジェスチャー判定・drag vs pet判定・設定カスタマイズ
- `domain/character/AnimationResolver.test.ts` — デフォルトリゾルバが全11状態でSTATE_CONFIGS準拠を検証
- `domain/character/EnrichedAnimationResolver.test.ts` — 全16ルールの個別テスト+統合テスト（優先順位・感情ルール・リアクションルール）
- `domain/character/EmotionState.test.ts` — createDefaultEmotionState・applyEmotionEvent全4イベント・tickEmotion自然変化・クランプ
- `domain/character/InteractionTracker.test.ts` — クリック記録・3秒ウィンドウ除去・餌やり記録・resetDaily
- `domain/environment/SceneConfig.test.ts` — shouldScroll・状態別スクロール判定・デフォルト設定
- `domain/environment/WeatherConfig.test.ts` — createDefaultWeatherConfig・resolveTimeOfDay境界値・cloudPresetLevel全天気タイプ
- `domain/environment/EnvironmentTheme.test.ts` — resolveEnvironmentTheme全20組み合わせ・sunny/day現行値一致・cloudy/snowyテーマ検証
- `domain/shared/EventBus.test.ts` — publish/subscribe基本動作
- `application/app-scene/AppSceneManager.test.ts` — シーン遷移・enterPomodoro/exitPomodoro/enterFureai/exitFureai・全サイクル
- `application/fureai/FureaiCoordinator.test.ts` — enterFureai/exitFureaiの協調テスト（シーン遷移+プリセット切替+EventBus発行+FeedingAdapter活性化）、feedCharacterテスト
- `application/character/InterpretPrompt.test.ts` — 英語/日本語キーワードマッチング・フォールバック
- `application/environment/ScrollUseCase.test.ts` — チャンク位置計算・リサイクル判定・reset
- `application/settings/AppSettingsService.test.ts` — 分→ms変換・バリデーション・updateTimerConfig・resetToDefault・バックグラウンド設定・天気設定（weatherConfig初期値/部分更新/cloudDensityLevel/イベント発行/リセット）
- `application/timer/PomodoroOrchestrator.test.ts` — start/exit/pause/resume/tick・phaseToPreset・イベント発行
- `application/timer/TimerSfxBridge.test.ts` — work完了音/ファンファーレ使い分け・休憩BGMクロスフェード・エラーハンドリング・shouldPlayAudio
- `application/notification/NotificationBridge.test.ts` — バックグラウンド通知発行・フォアグラウンド時スキップ・無効時スキップ・long-break/congratsスキップ・解除関数
- `domain/statistics/StatisticsTypes.test.ts` — emptyDailyStats・todayKey・formatDateKey
- `application/statistics/StatisticsService.test.ts` — CRUD操作・getRange・loadFromStorage・バリデーション
- `application/statistics/StatisticsBridge.test.ts` — EventBus購読→StatisticsService更新・解除関数

#### フェイクタイマー検討結果

結論: **全25ファイル・518テストにおいてvi.useFakeTimers()は不要**。

ドメイン層・アプリケーション層はフェイクタイマーが不要になるよう設計されている。

| 分類 | ファイル数 | テスト数 |
|------|----------|---------|
| タイミングAPI不使用 | 15 | 209 |
| tick(deltaMs)パターン | 7 | 191 |
| Date使用だが固定値入力 | 3 | 36 |

設計上の特性:
- **相対時間パターン**: `tick(deltaMs)`で経過時間を引数として注入する。setTimeout/setIntervalに依存しない
- **日付の引数注入**: `addWorkPhase('2025-01-15', ms)`のように日付文字列を外部から渡す。`new Date()`への直接依存がない
- **タイムスタンプの分離**: `Date.now()`はイベントメタデータの記録のみに使用する。テストはタイムスタンプ値を検証しない

フェイクタイマーが必要になるのはsetTimeout/setIntervalを直接使うコード（src/main.tsのバックグラウンドタイマー等）だが、インフラ層でありユニットテストのカバレッジ対象外。E2Eテストでカバー済み。

#### E2Eテスト（Playwright）
Electronアプリの統合テスト。`npm run test:e2e`で実行。`VITE_DEBUG_TIMER=3/2/3/2`で短縮ビルドし、全ポモドーロサイクルを約1.5分で検証。vanilla-extractのハッシュ化クラス名を回避するため`data-testid`属性を使用。

- `e2e/helpers/launch.ts` — Electronアプリ起動/終了ヘルパー
- `e2e/smoke.spec.ts` — 起動・タイトル表示・Start Pomodoroボタン存在
- `e2e/free-mode.spec.ts` — 設定パネルトグル・ボタン選択・Set確定・BG Audio/Notifyトグル表示・操作・スナップショット復元
- `e2e/pomodoro-flow.spec.ts` — モード遷移・Pause/Resume・Stop・タイマー完走→congrats→free自動復帰
- `e2e/settings-ipc.spec.ts` — electronAPI存在確認・settings.json永続化・テーマ設定の再起動復元・showNotification API確認・BG設定永続化/復元・statistics API確認・天気設定永続化/再起動復元
- `e2e/weather-panel.spec.ts` — WeatherButton表示/クリック・パネル表示時の排他制御・CloseButton・天気タイプ切替active・autoWeather非活性・時間帯切替・スナップショット復元・Stats/Weather排他表示
- `e2e/button-visibility.spec.ts` — ボタン排他表示制御（設定・統計・天気パネル展開時）
- `e2e/stats-panel.spec.ts` — StatsButton・Statistics見出し・排他表示
- `e2e/fureai-mode.spec.ts` — ふれあいモード遷移・ボタン表示制御・freeモード復帰
- `e2e/theme.spec.ts` — テーマ切替のcolorScheme即時反映・スナップショット復元
- `e2e/animation-state.spec.ts` — デバッグインジケーター経由のアニメーション状態・感情パラメータ・プリセット切替・phaseProgress検証
- `e2e/free-display.spec.ts` — freeモード時刻表示・タイムラインバー・設定サマリー・終了時刻表示
- `e2e/prompt-input.spec.ts` — ふれあいモードプロンプト入力・キーワード→状態遷移・Sendボタン・空文字無視
- `e2e/pomodoro-detail.spec.ts` — サイクル進捗ドット・インタラクションロック・全フェーズ遷移順序・統計パネル値・affinity永続化・fatigue自然変化・バックグラウンドタイマー

##### E2Eフェイクタイマー検討結果

結論: **全13ファイル・78テストにおいてPlaywright page.clock導入は不可**。

Three.Clock/AnimationMixer/Web Audio APIが実時間に依存しており、フェイク化するとレンダリングパイプラインが破綻する。

| 分類 | テスト数 | 説明 |
|------|---------|------|
| タイミング依存なし | 41 | ボタン操作・パネル開閉など即時完了 |
| UI安定化の短い待機 | 11 | IPC永続化後の500ms。Node.js I/Oでありpage.clockでは制御不能 |
| 行動SM遷移待ち | 6 | rAFループ内tickで駆動。フェイク化するとrAFが自然発火しない |
| ポモドーロ実時間完走 | 20 | フルサイクル完走が必須。感情蓄積・遷移順序・統計値を検証 |

`VITE_DEBUG_TIMER=3/2/3/2`による短縮方式が実時間ベースで全パイプラインを正常動作させるため、現行アプローチが最適である。
