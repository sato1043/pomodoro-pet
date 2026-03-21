# アーキテクチャ

## レイヤー構成（クリーンアーキテクチャ）

```
domain（最内層）← application ← adapters ← infrastructure（最外層）
```

依存方向: 外→内のみ。domainは他の層を知らない。

## 階層的状態マシン

4層の階層的状態マシンでアプリケーション状態を管理する。

```
Layer 1: AppScene          — free | pomodoro | settings | fureai | gallery
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
  AppSceneChanged → SleepPreventionBridge（ポモドーロ中のOSスリープ抑制）
  PhaseCompleted(work/break/long-break)/PomodoroCompleted/PomodoroAborted → StatisticsBridge（統計記録）
  PomodoroCompleted/PomodoroAborted/FeedingSuccess → EmotionHistoryBridge（感情履歴記録）
  FeedingSuccess → SceneFureai（ハートエフェクト発火）、main.ts（EmotionService fed + InteractionTracker recordFeeding）
  PomodoroCompleted/PomodoroAborted → main.ts（EmotionService pomodoro_completed/pomodoro_aborted）
  KouChanged → KouSelector（七十二候ドロップダウン更新）、EnvironmentContext
  WeatherDecisionChanged → main.ts（天気エフェクト更新）
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
- `ScenePreset` — ScenePresetName型（'meadow'|'seaside'|'park'）、ChunkSpec（チャンク寸法+オブジェクト配置数）、resolvePreset()でプリセット名からChunkSpec解決
- `ChunkSpec` — チャンク寸法（幅・奥行き）とオブジェクト配置数（木・草・岩・花）。ScenePreset.tsで定義
- `shouldScroll()` — 現在の状態でスクロールすべきか判定する純粋関数
- `SceneObject` — シーンオブジェクト型定義
- `WeatherConfig` — 天気設定値オブジェクト（WeatherType, TimeOfDay, CloudDensityLevel 0-5, autoTimeOfDay, scenePreset, climate?）。`createDefaultWeatherConfig()`, `resolveTimeOfDay(hour)`, `cloudPresetLevel(weather)`
- `EnvironmentThemeParams` — 描画パラメータ（空色・霧・ライト・地面色・露出）。`resolveEnvironmentTheme(weather, timeOfDay)`で20パターンルックアップ
- `ThemeLerp` — テーマ遷移の純粋関数群。`lerpFloat`/`lerpHexColor`（RGB分解）/`lerpVec3`/`smoothstep`（3t²-2t³）/`lerpThemeParams`（全14フィールド一括補間）/`themeParamsEqual`（不要補間スキップ用）/`startThemeTransition`/`tickThemeTransition`。`ThemeTransitionState`/`ThemeTransitionResult`型。定数: `THEME_TRANSITION_DURATION_AUTO_MS`(5000)/`THEME_TRANSITION_DURATION_MANUAL_MS`(1500)
- `SolarPosition` — 太陽位置値オブジェクト（altitude/azimuth/eclipticLon）、LunarPosition値オブジェクト（altitude/azimuth/phase/illumination）、AstronomyPort（ドメインポート）
- `Kou` — 七十二候。KouDefinition型、KOU_DEFINITIONS（72候定義）、resolveKou()、kouProgress()
- `ClimateData` — 気候プロファイル。ClimateConfig（mode/presetName/latitude/longitude/label）、KouClimate、MonthlyClimateData、ClimateGridPort（ドメインポート）、CITY_PRESETS（8都市）、interpolateToKouClimate()、estimateTemperature()、temperatureToGroundColor()
- `WeatherDecision` — 天気自動決定。WeatherDecision型、mulberry32（PRNG）、decideWeather()、computeParticleCount()、cloudDensityToLevel()
- `CelestialTheme` — 天体→テーマ連続生成。computeThemeFromCelestial()、computeLightDirection()、altitudeToSunColor()、altitudeToSkyColor()
- `Timezone` — タイムゾーン解決。resolveTimezone()（tz-lookupラッパー+TZ_BOUNDARY_OVERRIDES境界補正）、getLocationTime()、formatTimezoneLabel()。事前生成済みtimezone-abbr.json（386エントリ）による略称マッピング

### 4. 統計
- `StatisticsTypes` — DailyStats型（日次集計）、emptyDailyStats()、todayKey()、formatDateKey()ヘルパー。StatisticsData型（Record<'YYYY-MM-DD', DailyStats>）

### 5. 共有
- `EventBus` — Pub/Subイベントバス。タイマーとキャラクター間を疎結合に連携

## ファイルマップ

### desktop/ — Electronプロセス
- `main/index.ts` — エントリポイント（BrowserWindow生成、dev/prod切替、SwiftShaderフォールバック、DevTools環境変数制御）。`__APP_ID__`（ビルド時define埋め込み）で`app.setAppUserModelId()`を設定（Windows通知に必須）。起動後10秒でライセンスチェック+アップデートチェック
- `main/types.ts` — 型定義（JwtPayload、HeartbeatResponse、LicenseState、UpdateStatus）
- `main/settings.ts` — 設定I/O（load/saveSettings、load/saveStatistics、load/saveEmotionHistory、getOrCreateDeviceId）。`app.getPath('userData')`配下のsettings.json/statistics.json/emotion-history.jsonを読み書き
- `main/export-import.ts` — データエクスポート/インポート（handleExportData、handleImportData）。settings+statistics+emotionHistoryをJSONファイルとしてエクスポート/インポート。インポート時にバージョン互換性検証・確認ダイアログ表示・deviceId/downloadKey/jwt保持マージ
- `main/license.ts` — ライセンス管理。RS256公開鍵によるJWT検証（decodeJwtPayload/verifyJwt）、2段階オンラインチェック（checkConnectivity→heartbeat）、ライセンス状態解決（resolveLicense）。getter/setterパターンで`currentLicenseState`を管理（getLicenseState/setLicenseState）。`__DEBUG_LICENSE__`でライセンスモード固定（ハートビートスキップ）
- `main/updater.ts` — autoUpdaterイベントハンドラ（initAutoUpdater）。checking/available/downloading/downloaded/errorの各状態をレンダラーに通知
- `main/ipc-handlers.ts` — 全IPCハンドラ登録（registerIpcHandlers）。設定永続化IPC、`notification:show`、`about:load`、`registration-guide:load`、`license:status`/`license:register`/`license:check`、`update:check`/`update:download`/`update:install`、`data:export`/`data:import`、`window:minimize`/`window:close`、`shell:openExternal`。`update:check`/`update:download`はexpired/restrictedモード時に早期リターン。`data:import`成功時はapp.relaunch()→app.exit(0)でアプリ再起動
- `preload/index.ts` — contextBridge（platform, loadSettings, saveSettings, showNotification, loadStatistics, saveStatistics, loadEmotionHistory, saveEmotionHistory, loadAbout, checkLicenseStatus, registerLicense, checkForUpdate, downloadUpdate, installUpdate, exportData, importData, windowMinimize, windowClose, openExternal, onUpdateStatus, onLicenseChanged公開）

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
- `character/value-objects/EmotionHistory.ts` — EmotionHistoryData/DailyEmotionRecord/CrossSessionEffect型定義 + recordEmotionEvent/updateLastSession/updateDailySnapshot/updateStreak/calculateCrossSessionEffect/applyCrossSessionChanges純粋関数
- `character/value-objects/BiorhythmState.ts` — BiorhythmState値オブジェクト（activity/sociability/focus）。calculateBaseBiorhythm()、applyBoost()、tickBoost()等の純粋関数
- `character/value-objects/Position3D.ts` — 3D位置
- `environment/value-objects/SceneConfig.ts` — SceneConfig, ChunkSpec, shouldScroll()
- `environment/value-objects/SceneObject.ts` — シーンオブジェクト型
- `environment/value-objects/ScenePreset.ts` — ScenePresetName型（'meadow'|'seaside'|'park'）、ScenePreset/ChunkSpecインターフェース、createMeadowPreset/createSeasidePreset/createParkPreset、resolvePreset()、ALL_SCENE_PRESETS
- `environment/value-objects/WeatherConfig.ts` — WeatherConfig（scenePreset含む）, WeatherType, TimeOfDay, CloudDensityLevel, resolveTimeOfDay(), cloudPresetLevel(). ScenePresetNameをre-export
- `environment/value-objects/EnvironmentTheme.ts` — EnvironmentThemeParams, resolveEnvironmentTheme()（20パターンルックアップ）
- `environment/value-objects/ThemeLerp.ts` — テーマ遷移の純粋関数群（lerpFloat/lerpHexColor/lerpVec3/smoothstep/lerpThemeParams/themeParamsEqual/startThemeTransition/tickThemeTransition）+ ThemeTransitionState/ThemeTransitionResult型 + 遷移時間定数
- `environment/value-objects/SolarPosition.ts` — SolarPosition型（altitude/azimuth/eclipticLon）、LunarPosition型（altitude/azimuth/phase/illumination）、AstronomyPortインターフェース
- `environment/value-objects/Kou.ts` — KouDefinition型、KOU_DEFINITIONS定数（本朝七十二候全72候、和名/読み/英名/説明）、resolveKou(eclipticLon)、kouProgress(eclipticLon)
- `environment/value-objects/ClimateData.ts` — ClimateConfig型、KouClimate型、MonthlyClimateData型、ClimateGridPortインターフェース、KoppenClassification型、CITY_PRESETS（8都市）、interpolateToKouClimate()、estimateTemperature()、temperatureToGroundColor()、eclipticLonToDayOfYear()、classifyKoppen()（ケッペン気候区分算出、30分類）
- `environment/value-objects/WeatherDecision.ts` — WeatherDecision型、mulberry32（決定論的PRNG）、decideWeather()、computeParticleCount()、cloudDensityToLevel()
- `environment/value-objects/CelestialTheme.ts` — computeThemeFromCelestial()（天体位置→EnvironmentThemeParams連続生成、月データ5フィールド計算含む）、computeLightDirection()（太陽/月クロスフェード、月光intensity係数0.8）、altitudeToSunColor()、altitudeToSkyColor()
- `environment/value-objects/MoonPhase.ts` — generateMoonPhasePixels(phaseDeg, size, illumination) → Uint8ClampedArray。Three.js非依存の月位相テクスチャ生成純粋関数。terminator曲線算出、リムライト、マリア模様、ソフトエッジ
- `environment/value-objects/Timezone.ts` — resolveTimezone(lat,lon)（tz-lookupラッパー+TZ_BOUNDARY_OVERRIDES境界補正）、getLocationTime(date,tz)、formatTimezoneLabel(tz,date)。timezone-abbr.json（386エントリ）による略称マッピング
- `statistics/StatisticsTypes.ts` — DailyStats型、StatisticsData型、emptyDailyStats()、todayKey()、formatDateKey()
- `shared/EventBus.ts` — Pub/Subイベントバス
- `shared/ExportData.ts` — エクスポートデータ型定義（ExportData, ValidationResult）とバリデーション関数（validateExportData）

### src/application/ — ユースケース
- `app-scene/AppScene.ts` — AppScene型定義（free/pomodoro/settings/fureai/gallery）とAppSceneEvent型
- `app-scene/AppSceneManager.ts` — アプリケーションシーン管理（enterPomodoro/exitPomodoro/enterFureai/exitFureai/enterGallery/exitGallery）。純粋な状態ホルダー（EventBus不要）
- `fureai/FureaiCoordinator.ts` — ふれあいモードのシーン遷移+プリセット切替+餌やり制御を協調。enterFureai()でfureai-idleプリセット+FeedingAdapter活性化、exitFureai()でautonomousプリセット+FeedingAdapter非活性化。feedCharacter()でfeeding状態遷移。PomodoroOrchestratorとは独立
- `gallery/GalleryCoordinator.ts` — ギャラリーモードのシーン遷移+アニメーション再生の協調。enterGallery()でgalleryシーン遷移、exitGallery()でfreeシーン遷移+autonomousプリセット復帰。playState()/playAnimationSelection()でstopAnimation()+再生。applyCharacterOffset()/resetCharacterOffset()でキャラクター位置オフセット制御
- `gallery/GalleryAnimationData.ts` — 13クリップ（GalleryClipItem）+11状態（GalleryStateItem、loopオーバーライド対応）+14ルール（GalleryRuleItem）の表示データ定義。ルールのAnimationSelectionはEnrichedAnimationResolverの結果をハードコード
- `app-scene/DisplayTransition.ts` — 宣言的シーン遷移グラフ。DisplayScene型（AppScene+PhaseTypeの結合キー）、DISPLAY_SCENE_GRAPH定数（遷移ルールテーブル）、DisplayTransitionState（テーブルルックアップ状態管理）、toDisplayScene()変換ヘルパー
- `settings/AppSettingsService.ts` — タイマー設定＋サウンド設定＋バックグラウンド設定＋電源設定管理。分→ms変換＋バリデーション＋永続化（Electron IPC経由）。`SettingsChanged`/`SoundSettingsLoaded`/`BackgroundSettingsLoaded`イベント発行。`BackgroundConfigInput`（backgroundAudio/backgroundNotify）でバックグラウンド時のオーディオ再生・通知発行を制御。`PowerConfigInput`（preventSleep）でポモドーロ中のOSスリープ抑制を制御
- `license/LicenseState.ts` — ライセンス状態の型定義と判定ロジック（resolveLicenseMode, isFeatureEnabled, needsHeartbeat）。`ENABLED_FEATURES`マップ（デフォルト無効方式）でモード×機能の有効化を一元管理。registered/trialは全機能有効（gallery含む）、expired/restrictedはpomodoroTimer+characterのみ
- `settings/SettingsEvents.ts` — SettingsChanged, SoundSettingsLoaded, BackgroundSettingsLoadedイベント型定義
- `timer/PomodoroOrchestrator.ts` — AppScene遷移+タイマー操作+キャラクター行動を一元管理。階層間連動は直接コールバック、EventBusはUI/インフラ通知のみ。手動中断時に`PomodoroAborted`、サイクル完了時に`PomodoroCompleted`をEventBus経由で発行
- `timer/PomodoroEvents.ts` — ポモドーロライフサイクルイベント型（PomodoroAborted/PomodoroCompleted判別共用体）
- `character/InterpretPromptUseCase.ts` — キーワードマッチング（英語/日本語→行動）
- `character/UpdateBehaviorUseCase.ts` — 毎フレームtick。StateMachine遷移 + AnimationResolver経由のアニメーション選択 + ScrollManager経由で背景スクロール制御。`UpdateBehaviorOptions`でリゾルバ・phaseProgress・emotion・interaction・timeOfDay・todayCompletedCyclesを注入
- `character/EmotionService.ts` — 感情パラメータ管理サービス。tick(deltaMs, isWorking)で自然変化、applyEvent()でイベント適用、loadAffinity()/loadFullState()で永続化値復元
- `character/EmotionHistoryService.ts` — 感情履歴の永続化サービス。emotion-history.jsonへの読み書き、日次スナップショット・イベントカウント・streak管理、起動時クロスセッション効果計算
- `character/EmotionHistoryBridge.ts` — EventBus購読→EmotionHistoryServiceへの感情イベント記録ブリッジ
- `character/EmotionEvents.ts` — 感情UI通知イベント型。`EmotionStateUpdatedEvent`（type + state: EmotionState）。main.tsのrAFループから1秒間隔スロットリングで発行、感情イベント時は即時発行
- `character/BiorhythmService.ts` — バイオリズム管理サービス。tick(deltaMs)でブースト減衰+再計算、applyFeedingBoost()/applyPettingBoost()でケアブースト、setOriginDay()でoriginDay設定
- `timer/TimerSfxBridge.ts` — タイマーSFX一元管理。PhaseStarted(work)でwork開始音、PhaseStarted(congrats)でファンファーレ、PhaseStarted(break)でwork完了音（long-break前はスキップする遅延判定）。break/long-break中は`break-chill.mp3`ループ再生、残り30秒で`break-getset.mp3`にクロスフェード切替。`PomodoroAborted`で`pomodoro-exit.mp3`を再生。`AudioControl`で環境音の停止/復帰を制御（EventBus経由）。`shouldPlayAudio`コールバックでバックグラウンド時のオーディオ抑制に対応
- `notification/NotificationBridge.ts` — EventBus購読でバックグラウンド時にシステム通知を発行。PhaseCompleted(work)→「休憩の時間」、PhaseCompleted(break)→「作業の時間」、PomodoroCompleted→「サイクル完了！」。long-break/congratsはスキップ。`NotificationPort`インターフェースでElectron Notification APIを抽象化
- `sleep-prevention/SleepPreventionBridge.ts` — AppSceneChanged購読でポモドーロ中のOSスリープを抑制。scene='pomodoro' && preventSleep有効時にport.start()、scene変更時にport.stop()。`SleepPreventionPort`インターフェースでElectron powerSaveBlocker APIを抽象化
- `statistics/StatisticsService.ts` — 日次統計CRUD+永続化サービス。getDailyStats/getRange/addWorkPhase/addBreakPhase/addCompletedCycle/addAbortedCycle。データバリデーション付きload。更新ごとに即座にsaveToStorage
- `statistics/StatisticsBridge.ts` — EventBus購読→StatisticsService更新。PhaseCompleted(work/break/long-break)→addWorkPhase/addBreakPhase、PomodoroCompleted→addCompletedCycle、PomodoroAborted→addAbortedCycle。NotificationBridgeと同パターン
- `environment/ThemeTransitionService.ts` — テーマ遷移サービス。`transitionTo(target, durationMs)`で補間開始、`applyImmediate(target)`で即座適用、`tick(deltaMs)`で補間更新（変化時のみパラメータ返却）。currentParams=null時のtransitionToは即座適用にフォールバック。補間中の新transitionToは現在の中間値をfromとして再補間
- `environment/EnvironmentCoordinator.ts` — 環境設定シーンのcoordinator。enterEnvironment()でシーン遷移+WeatherPreviewOpen発行（カメラ後退）、exitEnvironment()でWeatherPreviewOpen解除+シーン遷移（カメラ復帰）。FureaiCoordinator/GalleryCoordinatorと同パターン
- `environment/EnvironmentSimulationService.ts` — 天文計算ベース環境シミュレーション統合オーケストレーター。start(climate, scenePreset)/tick(deltaMs)/onClimateChanged()/stop()。30秒間隔で天体位置更新→テーマ生成→ThemeTransitionService適用。日単位で天気再決定。setAutoWeather/setManualWeather/setManualTimeOfDay（擬似太陽/月位置によるテーマオーバーライド）。手動操作時の遷移時間1.5秒（通常tick時30秒）。KouChanged/WeatherDecisionChangedイベント発行
- `environment/ScrollUseCase.ts` — チャンク位置計算・リサイクル判定（Three.js非依存）

### src/adapters/ — UIとThree.jsアダプター
- `three/ThreeCharacterAdapter.ts` — FBX/プレースホルダー統合キャラクター表示。`FBXCharacterConfig`でモデルパス・スケール・テクスチャ・アニメーションを一括設定
- `three/ThreeInteractionAdapter.ts` — Raycasterベースのホバー/クリック/摘まみ上げ（Y軸持ち上げ）/撫でる。`InteractionConfig`で状態別ホバーカーソルをカスタマイズ可能
- `three/FeedingInteractionAdapter.ts` — 餌オブジェクト（キャベツ/リンゴ）のD&D餌やり操作。複数CabbageHandle[]対応。Z平面投影+NDCベースZ制御（べき乗カーブ）。ふれあいモード時カメラ後退。`FeedingSuccess`イベント発行。`isActive`フラグでふれあいモード中のみ動作
- `ui/EnvironmentContext.tsx` — 環境パラメータ（climate/currentKou/solarAltitude/isDaytime/timezone）のReact Context。EventBus購読→React状態変換のアダプター。updateClimate操作で永続化+イベント発行を内包。CIVIL_TWILIGHT_ALTITUDE(-6°)でisDayTime判定
- `ui/App.tsx` — Reactルートコンポーネント。`AppProvider`で依存注入し、`EnvironmentProvider` → `ThemeProvider` → `LicenseProvider` → `SceneRouter`の順で配置
- `ui/AppContext.tsx` — `AppDeps`インターフェース定義とReact Context。`useAppDeps()`フックで全依存を取得
- `ui/LicenseContext.tsx` — ライセンスReact Context。`LicenseProvider`が`onLicenseChanged`購読+`checkLicenseStatus`初期ロード。`useLicenseMode()`フックで`{ licenseMode, serverMessage, canUse }`を返す。`canUse(feature)`は`licenseMode ?? 'trial'`で`isFeatureEnabled()`を呼ぶヘルパー（null時はtrial扱い。trialではfureai/galleryが無効）
- `ui/SceneRouter.tsx` — AppScene切替コーディネーター。`AppSceneChanged`購読でSceneFree/ScenePomodoro/SceneFureai/SceneGallery/SceneEnvironmentを切替。シーン間遷移は常にblackout。`useLicenseMode()`でライセンス状態+リリースチャネルを取得しLicenseToast+TrialBadge+ChannelBadgeに渡す。WindowTitleBarをグローバル配置
- `ui/WindowTitleBar.tsx` — カスタムタイトルバー（frame: false用）。createPortalでdocument.bodyに描画。透明背景+右上に最小化・閉じるボタン（インラインSVGアイコン）。-webkit-app-region: dragでウィンドウ移動。z-index: 9999、pointer-events: none（ボタンのみauto）で下層UIへのクリック透過を確保
- `ui/SceneFree.tsx` — freeシーンコンテナ。OverlayFree+StartPomodoroButton+SettingsButton+StatsButton+FureaiEntryButton+WeatherButton+GalleryEntryButton+StatsDrawer+FeatureLockedOverlayを束ねる。showStats/settingsExpanded/showLockedで表示切替を管理。WeatherButtonクリックでenvironmentCoordinator.enterEnvironment()を呼びSceneEnvironmentへ遷移。`canUse()`でStatsButton/WeatherButton(環境設定)の表示を制御。FureaiEntryButton/GalleryEntryButtonは常時表示し、クリック時にcanUse判定→locked時はFeatureLockedOverlay表示
- `ui/SceneEnvironment.tsx` — environmentシーンコンテナ。WeatherPanel+KouSelector+WorldMapModal+EnvironmentExitButtonを束ねる。内部状態`view: 'weather' | 'worldMap'`で表示切替。weatherビューでWeatherPanel+KouSelectorを表示、WeatherPanelのLocationボタンでworldMapビューに遷移、WorldMapModalのcloseでweatherビューに戻る
- `ui/EnvironmentExitButton.tsx` — environmentモードからfreeモードへの戻るボタン。←矢印アイコン。environmentCoordinator.exitEnvironment()を呼ぶ
- `ui/ScenePomodoro.tsx` — pomodoroシーンコンテナ。OverlayPomodoroを束ねる
- `ui/SceneFureai.tsx` — fureaiシーンコンテナ。OverlayFureai+FureaiExitButton+PromptInput+HeartEffectを束ねる。FeedingSuccess購読でハートエフェクト発火
- `ui/SceneGallery.tsx` — galleryシーンコンテナ。OverlayGallery+GalleryExitButtonを束ねる。useEffectでマウント時にapplyCharacterOffset()、アンマウント時にresetCharacterOffset()（暗転中に移動完了）
- `ui/OverlayGallery.tsx` — ギャラリーモードオーバーレイ。createPortalでdocument.bodyに描画。CompactHeader+GalleryTopBar+GallerySideBarを統合。Clips/States/Rulesモード切替+2行構成情報バー（description+詳細）。モード別のinfoBar表示制御（clips: State非表示、rules: State/Clip非表示）
- `ui/CompactHeader.tsx` — コンパクトヘッダーコンポーネント。タイトル「Pomodoro Pet」+時計表示+children prop対応。createPortalでdocument.bodyに描画。OverlayFureaiとOverlayGalleryで共用。OverlayFureaiではchildrenにBiorhythmChart+EmotionIndicator+CharacterNameEditorを配置
- `ui/GalleryTopBar.tsx` — ギャラリーモード切替タブバー。Clips/States/Rulesの3モード。GalleryMode型をexport。createPortalでdocument.bodyに描画
- `ui/GallerySideBar.tsx` — ギャラリーアニメーション選択サイドバー。GallerySideBarItem型（key/label/description）。createPortalでdocument.bodyに描画
- `ui/GalleryEntryButton.tsx` — ギャラリーモード遷移ボタン。画面左下のグリッドSVGアイコン（`bottom: 280`）。onClick propsで動作を外部から制御。createPortalでdocument.bodyに描画
- `ui/GalleryExitButton.tsx` — ギャラリーモードからfreeモードへの戻るボタン。←矢印アイコン
- `ui/HeartEffect.tsx` — 餌やり成功時のハートパーティクルエフェクト。createPortal+SVGハート+floatUpアニメーション
- `ui/AboutContent.tsx` — About画面（`data-testid="about-content"`）。IPC経由でバージョン情報+THIRD_PARTY_LICENSES.txt取得。PolyForm Noncommercial 1.0.0表示。×ボタンで設定パネルに戻る
- `ui/OverlayFree.tsx` — freeモードオーバーレイ。createPortalでdocument.bodyに描画。タイトル+日付表示。FreeTimerPanelを統合（editor.expandedでFreeSummaryView/FreeSettingsEditor/AboutContentを切替）。showAboutステートで設定パネル内のAbout表示を制御。useSettingsEditorフックでスナップショット/復元を管理。`canUse()`で設定エディタ内の制限適用（timerSettings無効→FreeTimerSettings非表示、soundSettings無効→プリセット選択非表示、backgroundNotify無効→通知トグルdisabled）
- `ui/OverlayFureai.tsx` — fureaiモードオーバーレイ（`data-testid="overlay-fureai"`）。createPortalでdocument.bodyに描画。CompactHeaderのchildrenにBiorhythmChart+EmotionIndicator+CharacterNameEditorを配置。canUse('biorhythm')/'emotionAccumulation'で条件付き描画
- `ui/BiorhythmChart.tsx` — バイオリズムグラフコンポーネント。3軸ネオンカラーサインカーブ（activity/sociability/focus）前後3日+カーブ上移動ドットアニメーション。buildBiorhythmCurves/pointsToPathをexport（テスト用）。OverlayFureaiがCompactHeaderのchildrenとして描画
- `ui/EmotionIndicator.tsx` — 感情インジケーターUI。♥⚡★の3アイコンをopacity（0.15〜1.0）で表示。`EmotionStateUpdated`イベントをuseEventBusCallbackで購読。OverlayFureaiがcanUse('emotionAccumulation')で条件付き描画
- `ui/TrialBadge.tsx` — trialモード表示バッジ。右下に「Trial」を薄く常時表示（opacity: 0.55、pointerEvents: none）。licenseMode==='trial'時のみ描画
- `ui/FeatureLockedOverlay.tsx` — プレミアム機能ロックオーバーレイ。trial中にfureai/galleryボタン押下時に表示。購入インセンティブメッセージ+ストアリンク+Closeボタン。背景クリックで閉じる
- `ui/FureaiEntryButton.tsx` — ふれあいモード遷移ボタン。画面右下のリンゴSVGアイコン（`right: 10`, `bottom: 112`）。onClick propsで動作を外部から制御。createPortalでdocument.bodyに描画
- `ui/FureaiExitButton.tsx` — ふれあいモードからfreeモードへの戻るボタン。←矢印アイコン。FureaiEntryButtonと同位置
- `ui/StartPomodoroButton.tsx` — Start Pomodoroボタン。画面下部固定（`bottom: 20`）
- `ui/SetButton.tsx` — 設定確定ボタン。StartPomodoroButtonと同位置・同スタイル
- `ui/BackButton.tsx` — 統計パネルからの戻るボタン。StartPomodoroButtonと同位置、キャンセル色
- `ui/SettingsButton.tsx` — 設定パネル展開ボタン。ギアSVGアイコン（`bottom: 112`）
- `ui/StatsButton.tsx` — 統計パネル表示ボタン。チャートSVGアイコン（`bottom: 168`）
- `ui/OverlayPomodoro.tsx` — pomodoroモードオーバーレイ。createPortalでdocument.bodyに描画。`PhaseStarted`購読でwork/break/congrats切替。DisplayTransitionStateでイントラ・ポモドーロ遷移エフェクト解決。背景ティント計算。PomodoroTimerPanel/CongratsPanel描画
- `ui/SceneTransition.tsx` — 暗転レンダリング。全画面暗転オーバーレイ（z-index: 10000）。`playBlackout(cb)`: opacity 0→1 (350ms) → cb() → opacity 1→0 (350ms)。forwardRef+useImperativeHandleで親からの呼び出しに対応。SceneRouter（シーン間）とOverlayPomodoro（イントラ・ポモドーロ）がそれぞれインスタンスを所有
- `ui/StatsDrawer.tsx` — 統計ドロワーパネル。サマリー3カード（Today/7Days/30Days: work完了数+累計時間）、13週カレンダーヒートマップ（SVG、work完了数5段階）、累計(work+break)時間の折れ線グラフ（SVG、最終点に放射状グラデーション脈動アニメーション付き）、感情推移グラフ（canUse('emotionAccumulation')で条件付き描画）
- `ui/EmotionTrendChart.tsx` — 感情推移折れ線グラフ。satisfaction/fatigue/affinityの3曲線+ポモドーロ完了数イベントバー。期間切替（7d/30d/All）。buildEmotionTrendData/computeDateRange純粋関数をexport。pointsToPathをBiorhythmChartから再利用
- `ui/PomodoroTimerPanel.tsx` — pomodoroモード。SVG円形プログレスリング（200px, r=90, stroke-width=12）でタイマー進捗をアナログ表現。リング内にフェーズラベル＋フェーズカラー数字（work=緑、break=青、long-break=紫）を配置。背景にフェーズカラーの下→上グラデーションティント（時間経過でalpha 0.04→0.24に濃化）。左肩にサイクル進捗ドット、右肩にpause/stopのSVGアイコンボタン。`phaseColor`/`overlayTintBg`純粋関数をexport
- `ui/CongratsPanel.tsx` — congratsモード。祝福メッセージ＋CSS紙吹雪エフェクト
- `ui/VolumeControl.tsx` — サウンドプリセット選択・ボリュームインジケーター・ミュートの共通コンポーネント。ボリューム変更/ミュート解除時にSfxPlayerでテストサウンドを再生。ミュート/ボリューム操作時にAudioAdapter（環境音）とSfxPlayer（SFX）の両方を同期
- `ui/CharacterNameEditor.tsx` — キャラクター名の表示+インライン編集UI。名前テキスト（28px、textSecondary、ドロップシャドウ）をセンタリング表示し、右に鉛筆アイコンボタン（absolute配置）を配置。鉛筆ボタンクリックのみで編集モードに遷移。Enter/blur確定、Escキャンセル。最大20文字、空文字→デフォルト名'Wildboar'復帰。AppSettingsService.updateCharacterConfig()で永続化
- `ui/PromptInput.tsx` — プロンプト入力UI
- `ui/RegistrationContent.tsx` — 登録パネル（download key入力、Registration Guide表示）
- `ui/UpdateNotification.tsx` — アップデート通知バナー
- `ui/LicenseToast.tsx` — ライセンストースト
- `ui/TrialBadge.tsx` — trialモード中に右下に「Trial」を薄く常時表示（createPortalでbodyに描画、pointerEvents:none）
- `ui/ChannelBadge.tsx` — beta/alphaチャネル時に左下に「Beta」「Alpha」を薄く常時表示（createPortalでbodyに描画、pointerEvents:none）。stableチャネルでは非表示
- `ui/FeatureLockedOverlay.tsx` — trial中のプレミアム機能ボタン押下時に購入インセンティブ表示（スクリーンショット+キャッチコピー+Unlockボタン+✕閉じ）
- `ui/KouSelector.tsx` — 七十二候セレクタ。createPortalでdocument.bodyに描画。SceneEnvironmentのweatherビュー内で表示。3段構成: Row1（seasonラベル+#日付範囲）、Row2（英語名）、Row3（Autoアイコン+リストアイコン）。リストアイコンでフルスクリーン72候オーバーレイリスト表示（テーブル+詳細パネル、2クリック選択）。Auto時は天文計算候に逐次追従、手動時は任意の候（0-71）をリストから選択。`data-testid="kou-selector"/"kou-list-btn"/"kou-auto"/"kou-list-overlay"/"kou-list-close"`
- `ui/WorldMapModal.tsx` — 世界地図SVGモーダル。等距円筒図法（viewBox "-180 -90 360 180"）。astronomy-engineによるterminator昼夜境界描画。8都市プリセットピン+クリック任意座標選択。選択地点中心スクロール（最短方向アニメーション）。1/3幅表示・全画面化。Natural Earth IDLライン描画。ClimateConfig生成
- `ui/LocationButton.tsx` — 地球アイコンボタン（現在未使用。環境設定はSceneEnvironmentに移行済み）
- `ui/styles/kou-selector.css.ts` — 七十二候セレクタ用vanilla-extractスタイル
- `ui/styles/world-map-modal.css.ts` — 世界地図モーダル用vanilla-extractスタイル
- `ui/hooks/useEventBus.ts` — EventBus購読のReactフック。`useEventBus`（状態取得）、`useEventBusCallback`（コールバック実行）、`useEventBusTrigger`（再レンダリングトリガー）
- `ui/styles/theme.css.ts` — vanilla-extractテーマコントラクト定義（作業中）
- `ui/styles/*.css.ts` — コンポーネント別vanilla-extractスタイル（free-timer-panel, pomodoro-timer-panel, congrats-panel, heart-effect, scene-transition, volume-control, prompt-input, overlay, stats-drawer, biorhythm-chart, fureai-entry, stats-button, settings-button, registration, update-notification, license-toast, gallery, trial-badge, feature-locked, emotion-indicator, character-name-editor）

### src/infrastructure/ — フレームワーク・ドライバ
- `three/FBXModelLoader.ts` — FBXLoaderラッパー
- `three/AnimationController.ts` — AnimationMixer管理、crossFade、play()にspeed引数対応
- `three/PlaceholderCharacter.ts` — プリミティブ人型キャラクター+13種アニメーション（既存8種+run/attack2/damage1/damage2/getUp）
- `three/CabbageObject.ts` — プリミティブSphereGeometryキャベツ3Dオブジェクト。CabbageHandleインターフェースでposition/visible/reset操作
- `three/AppleObject.ts` — プリミティブ形状リンゴ3Dオブジェクト。CabbageHandleインターフェースを共用。スケール0.15
- `three/EnvironmentBuilder.ts` — 旧・単一シーン環境生成（InfiniteScrollRendererに置換済み）
- `three/ChunkDecorator.ts` — ChunkDecoratorインターフェース（populate/dispose）+ createChunkDecorator()ファクトリ。ScenePresetNameに応じたデコレータを生成
- `three/decorators/MeadowDecorator.ts` — 草原プリセットのデコレータ。木（ConeGeometry）、草（InstancedMesh）、岩（DodecahedronGeometry）、花
- `three/decorators/SeasideDecorator.ts` — 海辺プリセットのデコレータ。ヤシの木（放物線幹7セグメント+羽状複葉4-5フロンド）、波打ち際（水面PlaneGeometry+泡）、貝殻8個。mergeGeometriesでdraw call削減（幹・葉片・泡を各1 Meshに統合）
- `three/decorators/ParkDecorator.ts` — 公園プリセットのデコレータ。歩道（中央PlaneGeometry）、街灯（歩道脇等間隔・左右交互配置）、植え込み・花壇（歩道脇沿い配置）、ベンチ（歩道脇配置）、広葉樹（歩道近傍）
- `three/EnvironmentChunk.ts` — 1チャンク分の環境オブジェクト生成（ChunkDecorator委譲方式、地面メッシュ所有、regenerate対応）
- `three/InfiniteScrollRenderer.ts` — 3チャンクの3D配置管理（ScrollState→位置反映、リサイクル時regenerate、霧・背景色設定）。`applyTheme(params)`でEnvironmentThemeParamsに基づく空色・霧・地面色の動的更新。`rebuildChunks(spec, decorator)`でランタイムプリセット切替
- `three/RainEffect.ts` — 雨エフェクト。LineSegments（最大1200本、デフォルト650本）残像付き線分 + スプラッシュパーティクル（リングバッファ200個）。setDrawRange()で動的粒子数制御。WeatherEffectインターフェース定義（setParticleCount含む）
- `three/SnowEffect.ts` — 雪エフェクト。Points（最大900個、デフォルト750個）sin/cosゆらゆら揺れ。setDrawRange()で動的粒子数制御
- `three/CloudEffect.ts` — 雲エフェクト。半透明SphereGeometryクラスター、6段階密度（0-100個）、z方向ドリフト。天気別色（sunny=白emissive自発光、cloudy/rainy/snowy=灰色）
- `three/MoonEffect.ts` — 3D月オブジェクト。SphereGeometry(1.0, 32, 32)スケール18.0 + BackSide半透明グローメッシュ。MoonPhase.tsのgenerateMoonPhasePixels（地球照効果付き）でCanvasテクスチャを動的更新（位相・illumination変化時のみ）。fog無効、距離300配置。CelestialThemeでazimuth(北中心±25°)/altitude(22°-36°)リマップ
- `astronomy/AstronomyAdapter.ts` — astronomy-engineラッパー。AstronomyPort実装。Observer/SunPosition/Horizon/MoonPhase/Illumination使用。getSolarDeclinationAndGHA()ヘルパー（terminator UI用）
- `climate/ClimateGridAdapter.ts` — ClimateGridPort実装。`createClimateGridAdapter(data: ClimateGridJson)` でビルド時バンドルJSONを注入。36lat×72lon 5度解像度、双線形補間、海洋スナッピング
- `audio/ProceduralSounds.ts` — Web Audio APIプロシージャル環境音（Rain/Forest/Wind）
- `audio/AudioAdapter.ts` — 環境音の再生/停止/音量/ミュート管理。`MAX_GAIN=0.25`でUI音量値をスケーリング。初期値はvolume=0/isMuted=true（起動時のデフォルト音量フラッシュ防止）。ミュート時は`AudioContext.suspend()`でシステムリソース（PulseAudioストリーム等）を解放し、解除時に`resume()`で復帰する。`setBackgroundMuted()`でバックグラウンド時のオーディオ抑制に対応（ユーザーミュートとの共存: `updateSuspendState()`で`isMuted || backgroundMuted`を統合判定）
- `audio/SfxPlayer.ts` — MP3ワンショット再生（`play`）およびループ再生（`playLoop`/`stop`）。`crossfadeMs`指定時はループ境界・曲間切替でクロスフェード。per-source GainNodeで個別フェード制御+ファイル別音量補正（`gain`パラメータ）。fetch+decodeAudioData+バッファキャッシュ。`MAX_GAIN=0.25`でUI音量値をスケーリング。ミュート時はループ停止+クロスフェードタイマー解除+`ctx.suspend()`、`play()`/`playLoop()`はミュート中早期リターン。`setBackgroundMuted()`でバックグラウンド時のSFX抑制に対応

**ミュート操作の制約**: VolumeControl（ミュート/音量UIを含む）はOverlayFreeにのみ配置されている。ポモドーロ実行中（work/break/long-break/congrats）にはミュート操作のUIが存在しない。そのためミュート中にフェーズが遷移してBGMのplayLoop呼び出しが早期リターンされるシナリオは発生しない

### src/ — エントリ
- `main.ts` — 全モジュール統合・レンダリングループ。起動時に`loadFromStorage()`で設定・統計データ復元。`SoundSettingsLoaded`でAudioAdapter+SfxPlayerの両方にvolume/mute適用。blur/focusイベントでバックグラウンド検出（`document.hasFocus()`はElectronで信頼できないため）。バックグラウンド時はsetInterval(1秒)でタイマーを継続（rAFはバックグラウンドで停止するため）。NotificationBridge・StatisticsBridge・shouldPlayAudioコールバック・setBackgroundMutedの初期化。`currentLicenseMode`変数でライセンス状態を管理し、`onLicenseChanged`で更新。`VITE_DEBUG_LICENSE`で初期モード設定。`isFeatureEnabled()`でEmotionService.tick/applyEvent・NotificationBridge isEnabledをガード。EmotionStateUpdatedイベントを1秒間隔スロットリングでpublish、感情イベント時は即時publish。`ThemeTransitionService`でテーマ遷移をlerp補間（rAFループ内でtick→applyThemeToScene）。`applyWeather(config, immediate)`で即座/補間切替（初回起動はimmediate=true、他はfalse）。`SceneLights`にfill（フィルライト: DirectionalLight 0xb0c4de、castShadow=false、位置(0,2,5)）を追加。`applyThemeToScene()`内でexposure逆数ベースの非線形補正によりfill intensityを動的調整（日中≈0.01、夜間≈0.56）
- `electron.d.ts` — `window.electronAPI`型定義（platform, loadSettings, saveSettings, showNotification, startSleepBlocker, stopSleepBlocker, loadStatistics, saveStatistics, loadEmotionHistory, saveEmotionHistory, loadAbout, checkLicenseStatus, registerLicense, checkForUpdate, downloadUpdate, installUpdate, openExternal, onUpdateStatus, onLicenseChanged）。`LicenseMode`/`LicenseState`/`UpdateState`/`UpdateStatus`型定義
- `index.html` — HTMLエントリ

### scripts/ — ビルド・データ生成ツール
- `generate-climate-grid.ts` — NASA POWER API (1991-2020 climatology) から5度格子気候データを生成。2592地点をレート制限付きで取得し `assets/data/climate-grid.json` に出力。中間キャッシュ(`tmp/climate-cache/`)で中断・再開対応。`npm run generate:climate` で実行
- `generate-coastline-path.ts` — Natural Earth 110mデータ（ne_110m_land陸地ポリゴン + ne_110m_geographic_lines日付変更線）をダウンロードしSVGパス文字列に変換。`assets/data/coastline-path.json` に `{path, idlPath}` として出力。`npm run generate:coastline` で実行
- `generate-timezone-abbr.ts` — tz-lookupの全座標（1°解像度）をスキャンして412のIANAタイムゾーン名を収集し、system tzdataで略称を取得。Argentina `-03`→`ART`ポストプロセス。`assets/data/timezone-abbr.json`に出力。`npm run generate:tz-abbr` で実行

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
- `domain/character/EmotionHistory.test.ts` — createDefaultEmotionHistoryData・recordEmotionEvent全4イベント・updateLastSession・updateDailySnapshot・updateStreak連続/途切れ・イミュータブル性
- `domain/character/InteractionTracker.test.ts` — クリック記録・3秒ウィンドウ除去・餌やり記録・resetDaily
- `domain/environment/SceneConfig.test.ts` — shouldScroll・状態別スクロール判定・デフォルト設定
- `domain/environment/ScenePreset.test.ts` — 3プリセットのファクトリ関数・ChunkSpec値・resolvePreset・ALL_SCENE_PRESETS（13テスト）
- `domain/environment/WeatherConfig.test.ts` — createDefaultWeatherConfig（scenePreset含む）・resolveTimeOfDay境界値・cloudPresetLevel全天気タイプ
- `domain/environment/EnvironmentTheme.test.ts` — resolveEnvironmentTheme全20組み合わせ・sunny/day現行値一致・cloudy/snowyテーマ検証
- `domain/environment/ThemeLerp.test.ts` — lerpFloat/lerpHexColor/lerpVec3/smoothstep/lerpThemeParams/themeParamsEqual/tickThemeTransition（24テスト）
- `domain/environment/SolarPosition.test.ts` — AstronomyPort型定義・SolarPosition/LunarPosition型検証（11テスト）
- `domain/environment/Kou.test.ts` — KOU_DEFINITIONS検証・resolveKou境界値・kouProgress連続性（17テスト）
- `domain/environment/ClimateData.test.ts` — CITY_PRESETS・interpolateToKouClimate・estimateTemperature・temperatureToGroundColor（15テスト）
- `domain/environment/Timezone.test.ts` — resolveTimezone・getLocationTime・formatTimezoneLabel・DST対応・境界補正（16テスト）
- `domain/environment/WeatherDecision.test.ts` — mulberry32決定論性・decideWeather確率分布・computeParticleCount範囲・cloudDensityToLevel（18テスト）
- `domain/environment/CelestialTheme.test.ts` — altitudeToSunColor・altitudeToSkyColor・computeThemeFromCelestial（月光ブースト・moonPosition・moonOpacity含む）・computeLightDirection（26テスト）
- `domain/environment/MoonPhase.test.ts` — generateMoonPhasePixels（新月暗部・満月明部・上弦/下弦左右・illumination明度・角透明・サイズ変更、8テスト）
- `domain/shared/EventBus.test.ts` — publish/subscribe基本動作
- `domain/shared/ExportData.test.ts` — エクスポートデータバリデーション（正常系、不正形式、バージョン互換性、フィールド欠損、24テスト）
- `application/app-scene/AppSceneManager.test.ts` — シーン遷移・enterPomodoro/exitPomodoro/enterFureai/exitFureai/enterGallery/exitGallery・全サイクル
- `application/fureai/FureaiCoordinator.test.ts` — enterFureai/exitFureaiの協調テスト（シーン遷移+プリセット切替+EventBus発行+FeedingAdapter活性化）、feedCharacterテスト
- `application/gallery/GalleryCoordinator.test.ts` — enterGallery/exitGalleryの協調テスト（シーン遷移+EventBus発行+autonomousプリセット復帰）、playState/playAnimationSelectionテスト
- `application/character/InterpretPrompt.test.ts` — 英語/日本語キーワードマッチング・フォールバック
- `application/environment/ThemeTransitionService.test.ts` — transitionTo/applyImmediate/tick/補間中割り込み/同一テーマスキップ（9テスト）
- `application/environment/EnvironmentSimulationService.test.ts` — start/tick/onClimateChanged/stop・30秒更新間隔・イベント発行・即座テーマ適用・setAutoWeather/setManualWeather/setManualTimeOfDay切替（擬似太陽位置テーマオーバーライド・候計算非影響・stop時リセット）・setManualKou（手動候設定・null復帰・天気再決定・遷移時間・stop時リセット）・手動操作時の遷移時間1.5秒/通常tick時30秒・autoWeather状態管理・天気ソース切替・currentWeather停止時null（35テスト）
- `application/environment/ScrollUseCase.test.ts` — チャンク位置計算・リサイクル判定・reset
- `application/settings/AppSettingsService.test.ts` — 分→ms変換・バリデーション・updateTimerConfig・resetToDefault・バックグラウンド設定・電源設定（powerConfig）・天気設定（weatherConfig初期値/部分更新/cloudDensityLevel/イベント発行/リセット）・テーマ設定（themePreference初期値/light/dark/auto変更/resetToDefault）・loadFromStorageテーマ復元（全4モード/ThemeLoadedイベント/無効値拒否/未設定/null）
- `application/timer/PomodoroOrchestrator.test.ts` — start/exit/pause/resume/tick・phaseToPreset・イベント発行
- `application/timer/TimerSfxBridge.test.ts` — work完了音/ファンファーレ使い分け・休憩BGMクロスフェード・エラーハンドリング・shouldPlayAudio
- `application/notification/NotificationBridge.test.ts` — バックグラウンド通知発行・フォアグラウンド時スキップ・無効時スキップ・long-break/congratsスキップ・解除関数
- `application/sleep-prevention/SleepPreventionBridge.test.ts` — スリープ抑制のstart/stop制御・enabled/disabled判定・二重start防止・解除関数
- `domain/statistics/StatisticsTypes.test.ts` — emptyDailyStats・todayKey・formatDateKey
- `application/statistics/StatisticsService.test.ts` — CRUD操作・getRange・loadFromStorage・バリデーション
- `application/statistics/StatisticsBridge.test.ts` — EventBus購読→StatisticsService更新・解除関数
- `application/character/EmotionHistoryService.test.ts` — loadFromStorage・getLastSession・recordEvent・saveCurrentState・バリデーション
- `application/license/LicenseState.test.ts` — ライセンス判定ロジック+リリースチャネル判定（87テスト）
- `adapters/ui/BiorhythmChart.test.ts` — buildBiorhythmCurves純粋関数テスト（座標範囲・サンプル数・周期検証）+pointsToPathテスト（SVGパス生成）
- `adapters/ui/EmotionTrendChart.test.ts` — buildEmotionTrendData純粋関数テスト（座標範囲・均等配置・Y軸マッピング・日付ラベル・イベントバー）+computeDateRangeテスト（7d/30d/all期間計算）
- `domain/character/EmotionTrendData.test.ts` — extractDailyTrendEntries純粋関数テスト（空配列・範囲抽出・ソート・マッピング・イミュータブル）
- `e2e/emotion-trend.spec.ts` — 感情推移グラフE2E（Emotion Trends表示・期間ボタン3種・データなしメッセージ・ポモドーロ完走後SVG描画・期間切替動作）
- `adapters/ui/hooks/useResolvedTheme.test.ts` — テーマ解決ロジック（light/dark固定・system OS追従・auto isDaytime連動・市民薄明閾値-6°境界値・solarAltitude=null・ThemePreference全値網羅）（20テスト）
- `adapters/ui/LicenseContext.test.ts` — LicenseContext nullハンドリング（null→trial全機能有効、expired制限、restricted制限）
- `desktop/main/license.test.ts` — メインプロセスライセンスモジュール（decodeJwtPayload正常/異常、verifyJwt署名拒否、getLicenseState/setLicenseState状態管理）
- `desktop/main/window.test.ts` — ウィンドウ操作IPCハンドラ（window:minimize/window:close登録・BrowserWindow.minimize()/close()呼び出し・fromWebContents null安全性）
- `scripts/generate-coastline-path.test.ts` — SVGパス生成（ringToSubpath/lineToSubpath/landFeaturesToSvgPath/extractIdlPath）（16テスト）
- `scripts/generate-timezone-abbr.test.ts` — Etc/*スキップ・DST有無判定・南半球DST順序・Argentina ART ポストプロセス・Punta_Arenas非補正（6テスト）

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

- `e2e/helpers/launch.ts` — Electronアプリ起動/終了ヘルパー + setLicenseMode()（IPC経由でレンダラーのライセンスモードを切替）
- `e2e/smoke.spec.ts` — 起動・タイトル表示・Start Pomodoroボタン存在
- `e2e/free-mode.spec.ts` — 設定パネルトグル・ボタン選択・Set確定・BG Audio/Notifyトグル表示・操作・スナップショット復元
- `e2e/pomodoro-flow.spec.ts` — モード遷移・Pause/Resume・Stop・タイマー完走→congrats→free自動復帰
- `e2e/settings-ipc.spec.ts` — electronAPI存在確認・settings.json永続化・テーマ設定の再起動復元・showNotification API確認・BG設定永続化/復元・statistics API確認・天気設定永続化/再起動復元・autoWeather永続化/再起動復元（17テスト）
- `e2e/weather-panel.spec.ts` — environmentシーン遷移・freeUI非表示確認・天気タイプ切替active・autoWeather排他選択動作・autoWeather有効時disabled確認・時間帯切替・スナップショット復元・WeatherPanel Scene行Locationボタン表示・WeatherPanel→WorldMapModal→戻りでWeatherPanel復帰（environmentシーン内ビュー切替）・KouSelectorはenvironmentシーンのみ表示/Autoトグル/リスト手動選択Auto解除/日付範囲表示（22テスト）
- `e2e/button-visibility.spec.ts` — ボタン排他表示制御（設定・統計パネル展開時・environmentシーン遷移時）
- `e2e/stats-panel.spec.ts` — StatsButton・Statistics見出し・排他表示
- `e2e/emotion-indicator.spec.ts` — 感情インジケーター表示/非表示・3アイコン存在・opacity整合性・ライセンス制限（6テスト）
- `e2e/emotion-history.spec.ts` — 感情パラメータ永続化（初期状態範囲確認・全サイクル完走後satisfaction増加・emotionHistory IPC API存在・emotion-history.jsonファイル生成検証・アプリ再起動後復元）。cleanEmotionHistoryで前回テスト実行の永続化データをリセット
- `e2e/fureai-mode.spec.ts` — ふれあいモード遷移・ボタン表示制御・freeモード復帰（setLicenseModeでregistered切替）
- `e2e/gallery-mode.spec.ts` — ギャラリーモード遷移・ボタン表示制御・States/Rulesモード切替・アニメーション情報表示・freeモード復帰（setLicenseModeでregistered切替）
- `e2e/theme.spec.ts` — テーマ切替のcolorScheme即時反映・スナップショット復元
- `e2e/animation-state.spec.ts` — デバッグインジケーター経由のアニメーション状態・感情パラメータ・プリセット切替・phaseProgress検証
- `e2e/free-display.spec.ts` — freeモード時刻表示・タイムラインバー・設定サマリー・終了時刻表示
- `e2e/prompt-input.spec.ts` — ふれあいモードプロンプト入力・キーワード→状態遷移・Sendボタン・空文字無視（setLicenseModeでregistered切替）
- `e2e/pomodoro-detail.spec.ts` — サイクル進捗ドット・インタラクションロック・全フェーズ遷移順序・統計パネル値・affinity永続化・fatigue自然変化・バックグラウンドタイマー
- `e2e/trial-restriction.spec.ts` — trial badge表示・fureai/galleryロックオーバーレイ表示/閉じる（4テスト）
- `e2e/release-channel.spec.ts` — stableチャネルでchannel-badge非表示・stable機能の動作確認（2テスト）
- `e2e/registration.spec.ts` — 登録UI・API存在確認（8テスト）
- `e2e/window-controls.spec.ts` — カスタムタイトルバーのMinimize/Closeボタン存在確認・windowMinimize/windowClose API公開確認・Minimize後アプリ継続・frame: false確認（5テスト）

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
