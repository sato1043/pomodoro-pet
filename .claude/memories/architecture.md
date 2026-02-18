# アーキテクチャ

## レイヤー構成（クリーンアーキテクチャ）

```
domain（最内層）← application ← adapters ← infrastructure（最外層）
```

依存方向: 外→内のみ。domainは他の層を知らない。

## 階層的状態マシン

4層の階層的状態マシンでアプリケーション状態を管理する。

```
Layer 1: AppScene          — free | pomodoro | settings
Layer 2: PomodoroState     — work | break | long-break | congrats （+ running）
Layer 3: CharacterBehavior — autonomous | march-cycle | rest-cycle | joyful-rest | celebrate
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
  AppSceneChanged → TimerOverlay
  PhaseStarted/PhaseCompleted/TimerTicked/TimerPaused/TimerReset → TimerOverlay
  PhaseCompleted(work)/PhaseStarted(congrats) → TimerSfxBridge
  TriggerFired(break-getset/long-break-getset) → TimerSfxBridge（休憩BGM切替）
  PomodoroAborted → TimerSfxBridge（exit音再生）
  PomodoroCompleted → （現在は購読者なし、将来の統計機能等で利用）
  SettingsChanged → main.ts（session/Orchestrator/UI再作成）
  SoundSettingsLoaded → main.ts（AudioAdapter適用）
```

## 4つのドメインコンテキスト

### 1. タイマー
- `PomodoroStateMachine` — `CyclePlan`をインデックス走査する方式。`PomodoroState`判別共用体型で状態を表現。`exitManually()`でcongrats中以外の手動終了。デフォルト1セット/サイクル。サイクル完了自動停止。`PomodoroStateMachineOptions`でPhaseTimeTriggerを注入可能
- `CyclePlan` — `buildCyclePlan(config)`がTimerConfigからフェーズ順列（CyclePhase[]）を生成する値オブジェクト。最終workの直後にcongrats（5秒）を挿入し、最終休憩（Sets=1はBreak、Sets>1はLong Break）で終了
- `TimerPhase` — work / break / long-break / congrats の4フェーズ
- `TimerConfig` — 作業時間、休憩時間、長時間休憩時間、セット数
- `PhaseTrigger` — PhaseTimeTrigger型定義。`TriggerTiming`（elapsed/remaining）と`PhaseTriggerSpec`（id+timing）。`PhaseTriggerMap`で全フェーズのトリガーを定義。break/long-breakの残り30秒でgetsetトリガーを発行（休憩BGM切替に使用）
- `TimerEvents` — PhaseStarted, PhaseCompleted, SetCompleted, CycleCompleted, TimerTicked, TimerPaused, TimerReset, TriggerFired

### 2. キャラクター
- `Character` — 位置・状態管理
- `BehaviorStateMachine` — 10状態のステートマシン。BehaviorPresetで宣言的に振る舞いを制御。`applyPreset()`で遷移テーブル・スクロール・インタラクションロックを一括切替
- `BehaviorPreset` — 5種のプリセット定義（autonomous/march-cycle/rest-cycle/joyful-rest/celebrate）。`durationOverrides`でプリセット別に状態の持続時間を上書き可能（march-cycle: march 30〜60秒、idle 3〜5秒）
- `CharacterState` — 状態設定（アニメーション名、持続時間範囲、ループ有無）
- `GestureRecognizer` — ドラッグ/撫でるジェスチャー判定

### 3. 環境
- `SceneConfig` — 進行方向、スクロール速度、状態別スクロール有無
- `ChunkSpec` — チャンク寸法（幅・奥行き）とオブジェクト配置数（木・草・岩・花）
- `shouldScroll()` — 現在の状態でスクロールすべきか判定する純粋関数
- `SceneObject` — シーンオブジェクト型定義

### 4. 共有
- `EventBus` — Pub/Subイベントバス。タイマーとキャラクター間を疎結合に連携

## ファイルマップ

### desktop/ — Electronプロセス
- `main/index.ts` — メインプロセス（BrowserWindow生成、dev/prod切替、SwiftShaderフォールバック、DevTools環境変数制御、設定永続化IPC）
- `preload/index.ts` — contextBridge（platform, loadSettings, saveSettings公開）

### src/domain/ — ドメインモデル
- `timer/entities/PomodoroStateMachine.ts` — タイマー中核ロジック（CyclePlanインデックス走査方式、PomodoroState型、exitManually、PhaseTimeTrigger対応）
- `timer/value-objects/CyclePlan.ts` — フェーズ順列生成（buildCyclePlan, cycleTotalMs, CONGRATS_DURATION_MS）
- `timer/value-objects/TimerPhase.ts` — work/break/long-break/congratsフェーズ
- `timer/value-objects/PhaseTrigger.ts` — PhaseTimeTrigger型定義（TriggerTiming, PhaseTriggerSpec, PhaseTriggerMap）
- `timer/value-objects/TimerConfig.ts` — 設定（デフォルト25分/5分/15分長時間休憩/1セット）。`parseDebugTimer(spec)`でVITE_DEBUG_TIMERの秒数指定（`work/break/long-break/sets`）をパース
- `timer/events/TimerEvents.ts` — イベント型定義
- `character/entities/Character.ts` — キャラクターエンティティ
- `character/services/BehaviorStateMachine.ts` — 行動AIステートマシン（BehaviorPreset対応、fixedWanderDirection対応）
- `character/value-objects/BehaviorPreset.ts` — 5種のプリセット定義（autonomous/march-cycle/rest-cycle/joyful-rest/celebrate）
- `character/value-objects/CharacterState.ts` — 10状態定義+設定
- `character/value-objects/Position3D.ts` — 3D位置
- `environment/value-objects/SceneConfig.ts` — SceneConfig, ChunkSpec, shouldScroll()
- `environment/value-objects/SceneObject.ts` — シーンオブジェクト型
- `shared/EventBus.ts` — Pub/Subイベントバス

### src/application/ — ユースケース
- `app-scene/AppScene.ts` — AppScene型定義（free/pomodoro/settings）とAppSceneEvent型
- `app-scene/AppSceneManager.ts` — アプリケーションシーン管理（enterPomodoro/exitPomodoro）。純粋な状態ホルダー（EventBus不要）
- `app-scene/DisplayTransition.ts` — 宣言的シーン遷移グラフ。DisplayScene型（AppScene+PhaseTypeの結合キー）、DISPLAY_SCENE_GRAPH定数（遷移ルールテーブル）、DisplayTransitionState（テーブルルックアップ状態管理）、toDisplayScene()/displaySceneToMode()変換ヘルパー
- `settings/AppSettingsService.ts` — タイマー設定＋サウンド設定管理。分→ms変換＋バリデーション＋永続化（Electron IPC経由）。`SettingsChanged`/`SoundSettingsLoaded`イベント発行
- `settings/SettingsEvents.ts` — SettingsChanged, SoundSettingsLoadedイベント型定義
- `timer/PomodoroOrchestrator.ts` — AppScene遷移+タイマー操作+キャラクター行動を一元管理。階層間連動は直接コールバック、EventBusはUI/インフラ通知のみ。手動中断時に`PomodoroAborted`、サイクル完了時に`PomodoroCompleted`をEventBus経由で発行
- `timer/PomodoroEvents.ts` — ポモドーロライフサイクルイベント型（PomodoroAborted/PomodoroCompleted判別共用体）
- `character/InterpretPromptUseCase.ts` — キーワードマッチング（英語/日本語→行動）
- `character/UpdateBehaviorUseCase.ts` — 毎フレームtick（StateMachine遷移 + ScrollManager経由で背景スクロール制御）
- `timer/TimerSfxBridge.ts` — タイマーSFX一元管理。PhaseStarted(work)でwork開始音、PhaseStarted(congrats)でファンファーレ、PhaseStarted(break)でwork完了音（long-break前はスキップする遅延判定）。break/long-break中は`break-chill.mp3`ループ再生、残り30秒で`break-getset.mp3`にクロスフェード切替。`PomodoroAborted`で`pomodoro-exit.mp3`を再生。`AudioControl`で環境音の停止/復帰を制御（EventBus経由）
- `environment/ScrollUseCase.ts` — チャンク位置計算・リサイクル判定（Three.js非依存）

### src/adapters/ — UIとThree.jsアダプター
- `three/ThreeCharacterAdapter.ts` — FBX/プレースホルダー統合キャラクター表示。`FBXCharacterConfig`でモデルパス・スケール・テクスチャ・アニメーションを一括設定
- `three/ThreeInteractionAdapter.ts` — Raycasterベースのホバー/クリック/摘まみ上げ（Y軸持ち上げ）/撫でる。`InteractionConfig`で状態別ホバーカーソルをカスタマイズ可能
- `ui/App.tsx` — Reactルートコンポーネント。`AppProvider`で依存注入し、TimerOverlay/PromptInputを配置
- `ui/AppContext.tsx` — `AppDeps`インターフェース定義とReact Context。`useAppDeps()`フックで全依存を取得
- `ui/TimerOverlay.tsx` — モード遷移コーディネーター。FreeTimerPanel/PomodoroTimerPanel/CongratsPanelをモードに応じて切替。DisplayTransitionState+SceneTransitionによるシーントランジション（暗転フェード）管理。EventBus購読をmicrotaskコアレシングでrequestTransitionに集約
- `ui/SceneTransition.tsx` — 暗転レンダリング。全画面暗転オーバーレイ（z-index: 10000）。`playBlackout(cb)`: opacity 0→1 (350ms) → cb() → opacity 1→0 (350ms)。forwardRef+useImperativeHandleで親からの呼び出しに対応
- `ui/FreeTimerPanel.tsx` — freeモード。タイマー設定ボタングループ（Work/Break/LongBreak/Sets）＋VolumeControl統合。SVGアイコンのトグルで折りたたみ、タイムラインサマリー（色付き横棒グラフ＋時刻＋合計時間）に切替。展開時はSetボタンで確定、押さずに閉じるとスナップショット復元（タイマー設定・サウンド設定・sfxPlayer同期）
- `ui/PomodoroTimerPanel.tsx` — pomodoroモード。SVG円形プログレスリング（200px, r=90, stroke-width=12）でタイマー進捗をアナログ表現。リング内にフェーズラベル＋フェーズカラー数字（work=緑、break=青、long-break=紫）を配置。背景にフェーズカラーの下→上グラデーションティント（時間経過でalpha 0.04→0.24に濃化）。左肩にサイクル進捗ドット、右肩にpause/stopのSVGアイコンボタン。`phaseColor`/`overlayTintBg`純粋関数をexport
- `ui/CongratsPanel.tsx` — congratsモード。祝福メッセージ＋CSS紙吹雪エフェクト
- `ui/VolumeControl.tsx` — サウンドプリセット選択・ボリュームインジケーター・ミュートの共通コンポーネント。ボリューム変更/ミュート解除時にSfxPlayerでテストサウンドを再生。ミュート/ボリューム操作時にAudioAdapter（環境音）とSfxPlayer（SFX）の両方を同期
- `ui/PromptInput.tsx` — プロンプト入力UI
- `ui/hooks/useEventBus.ts` — EventBus購読のReactフック。`useEventBus`（状態取得）、`useEventBusCallback`（コールバック実行）、`useEventBusTrigger`（再レンダリングトリガー）
- `ui/styles/theme.css.ts` — vanilla-extractテーマコントラクト定義（作業中）
- `ui/styles/timer-overlay.css` — グローバルCSSスタイル（vanilla-extract移行対象）
- `ui/styles/*.css.ts` — コンポーネント別vanilla-extractスタイル（free-timer-panel, pomodoro-timer-panel, congrats-panel, scene-transition, volume-control, prompt-input, timer-overlay）

### src/infrastructure/ — フレームワーク・ドライバ
- `three/FBXModelLoader.ts` — FBXLoaderラッパー
- `three/AnimationController.ts` — AnimationMixer管理、crossFade
- `three/PlaceholderCharacter.ts` — プリミティブ人型キャラクター+8種アニメーション
- `three/EnvironmentBuilder.ts` — 旧・単一シーン環境生成（InfiniteScrollRendererに置換済み）
- `three/EnvironmentChunk.ts` — 1チャンク分の環境オブジェクト生成（ChunkSpecベース、中央帯回避配置、regenerate対応）
- `three/InfiniteScrollRenderer.ts` — 3チャンクの3D配置管理（ScrollState→位置反映、リサイクル時regenerate、霧・背景色設定）
- `audio/ProceduralSounds.ts` — Web Audio APIプロシージャル環境音（Rain/Forest/Wind）
- `audio/AudioAdapter.ts` — 再生/停止/音量/ミュート管理。`MAX_GAIN=0.25`でUI音量値をスケーリング。初期値はvolume=0/isMuted=true（起動時のデフォルト音量フラッシュ防止）
- `audio/SfxPlayer.ts` — MP3ワンショット再生（`play`）およびループ再生（`playLoop`/`stop`）。`crossfadeMs`指定時はループ境界・曲間切替でクロスフェード。per-source GainNodeで個別フェード制御+ファイル別音量補正（`gain`パラメータ）。fetch+decodeAudioData+バッファキャッシュ。`MAX_GAIN=0.25`でUI音量値をスケーリング

### src/ — エントリ
- `main.ts` — 全モジュール統合・レンダリングループ。起動時に`loadFromStorage()`で設定復元。`SoundSettingsLoaded`でAudioAdapter+SfxPlayerの両方にvolume/mute適用
- `electron.d.ts` — `window.electronAPI`型定義
- `index.html` — HTMLエントリ

### tests/
ドメイン層とアプリケーション層に集中。Three.js依存のアダプター/インフラ層はテスト対象外。`npm test`で全件実行、`npx vitest run --coverage`でカバレッジレポート生成。

- `domain/timer/PomodoroStateMachine.test.ts` — フェーズ遷移・tick・pause/reset・exitManually・セット進行・congrats・PhaseTimeTrigger
- `domain/timer/CyclePlan.test.ts` — セット構造生成・congrats挿入・Sets=1/複数・cycleTotalMs
- `domain/timer/TimerConfig.test.ts` — デフォルト値・バリデーション・parseDebugTimer書式パース
- `domain/character/BehaviorStateMachine.test.ts` — 全10状態遷移・5プリセット・durationOverrides・プロンプト遷移・tick・keepAlive・isScrollingState
- `domain/character/GestureRecognizer.test.ts` — ドラッグ/撫でるジェスチャー判定・drag vs pet判定・設定カスタマイズ
- `domain/environment/SceneConfig.test.ts` — shouldScroll・状態別スクロール判定・デフォルト設定
- `domain/shared/EventBus.test.ts` — publish/subscribe基本動作
- `application/app-scene/AppSceneManager.test.ts` — シーン遷移・enterPomodoro/exitPomodoro・全サイクル
- `application/character/InterpretPrompt.test.ts` — 英語/日本語キーワードマッチング・フォールバック
- `application/environment/ScrollUseCase.test.ts` — チャンク位置計算・リサイクル判定・reset
- `application/settings/AppSettingsService.test.ts` — 分→ms変換・バリデーション・updateTimerConfig・resetToDefault
- `application/timer/PomodoroOrchestrator.test.ts` — start/exit/pause/resume/tick・phaseToPreset・イベント発行
- `application/timer/TimerSfxBridge.test.ts` — work完了音/ファンファーレ使い分け・休憩BGMクロスフェード・エラーハンドリング
