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

EventBus（Pub/Sub）で疎結合。AppScene・タイマー・キャラクターはイベント経由で連携。

### イベントフロー

```
AppSceneManager → AppSceneChanged → TimerCharacterBridge, TimerOverlay, SettingsPanel
PomodoroStateMachine → TimerEvents → TimerCharacterBridge, TimerOverlay, TimerSfxBridge
CycleCompleted → AppSceneManager（自動でfreeに遷移）
AppSettingsService → SettingsChanged → main.ts（session/UI再作成）
AppSettingsService → SoundSettingsLoaded → main.ts（AudioAdapter適用）
```

## 4つのドメインコンテキスト

### 1. タイマー
- `PomodoroStateMachine` — `CyclePlan`をインデックス走査する方式。`PomodoroState`判別共用体型で状態を表現。`exitManually()`でcongrats中以外の手動終了。デフォルト1セット/サイクル。サイクル完了自動停止
- `CyclePlan` — `buildCyclePlan(config)`がTimerConfigからフェーズ順列（CyclePhase[]）を生成する値オブジェクト。congrats（5秒）を末尾に追加。Sets=1はBreak、Sets>1の最終セットはLong Break
- `TimerPhase` — work / break / long-break / congrats の4フェーズ
- `TimerConfig` — 作業時間、休憩時間、長時間休憩時間、セット数
- `TimerEvents` — PhaseStarted, PhaseCompleted, SetCompleted, CycleCompleted, TimerTicked, TimerPaused, TimerReset

### 2. キャラクター
- `Character` — 位置・状態管理
- `BehaviorStateMachine` — 10状態のステートマシン。BehaviorPresetで宣言的に振る舞いを制御。`applyPreset()`で遷移テーブル・スクロール・インタラクションロックを一括切替
- `BehaviorPreset` — 5種のプリセット定義（autonomous/march-cycle/rest-cycle/joyful-rest/celebrate）
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
- `timer/entities/PomodoroStateMachine.ts` — タイマー中核ロジック（CyclePlanインデックス走査方式、PomodoroState型、exitManually）
- `timer/value-objects/CyclePlan.ts` — フェーズ順列生成（buildCyclePlan, cycleTotalMs, CONGRATS_DURATION_MS）
- `timer/value-objects/TimerPhase.ts` — work/break/long-break/congratsフェーズ
- `timer/value-objects/TimerConfig.ts` — 設定（デフォルト25分/5分/15分長時間休憩/1セット）。`createDefaultConfig(debug)`でデバッグモード（1min/1min/1min）を切替
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
- `app-scene/AppSceneManager.ts` — アプリケーションシーン管理（enterPomodoro/exitPomodoro）。CycleCompleted購読で自動遷移
- `settings/AppSettingsService.ts` — タイマー設定＋サウンド設定管理。分→ms変換＋バリデーション＋永続化（Electron IPC経由）。`SettingsChanged`/`SoundSettingsLoaded`イベント発行
- `settings/SettingsEvents.ts` — SettingsChanged, SoundSettingsLoadedイベント型定義
- `timer/TimerUseCases.ts` — start/pause/reset/tick
- `character/InterpretPromptUseCase.ts` — キーワードマッチング（英語/日本語→行動）
- `character/UpdateBehaviorUseCase.ts` — 毎フレームtick（StateMachine遷移 + ScrollManager経由で背景スクロール制御）
- `character/TimerCharacterBridge.ts` — タイマーイベント+AppSceneChanged→BehaviorPreset切替でキャラクター行動連携
- `timer/TimerSfxBridge.ts` — PhaseCompleted(work)でwork完了音、PhaseStarted(congrats)でファンファーレ再生
- `environment/ScrollUseCase.ts` — チャンク位置計算・リサイクル判定（Three.js非依存）

### src/adapters/ — UIとThree.jsアダプター
- `three/ThreeCharacterAdapter.ts` — FBX/プレースホルダー統合キャラクター表示
- `three/ThreeInteractionAdapter.ts` — Raycasterベースのホバー/クリック/摘まみ上げ（Y軸持ち上げ）
- `ui/TimerOverlay.ts` — タイマーUI（上部、半透明パネル）。freeモードにタイマー設定ボタングループ（Work/Break/LongBreak/Sets）＋サウンド設定を統合。☰/×トグルで折りたたみ、タイムラインサマリーに切替
- `ui/VolumeControl.ts` — サウンドプリセット選択・ボリュームインジケーター・ミュートの共通コンポーネント
- `ui/PromptInput.ts` — プロンプト入力（下部中央）
- `ui/SettingsPanel.ts` — ギアアイコン→モーダルでEnvironment設定を提供（現在スタブ）

### src/infrastructure/ — フレームワーク・ドライバ
- `three/FBXModelLoader.ts` — FBXLoaderラッパー
- `three/AnimationController.ts` — AnimationMixer管理、crossFade
- `three/PlaceholderCharacter.ts` — プリミティブ人型キャラクター+8種アニメーション
- `three/EnvironmentBuilder.ts` — 旧・単一シーン環境生成（InfiniteScrollRendererに置換済み）
- `three/EnvironmentChunk.ts` — 1チャンク分の環境オブジェクト生成（ChunkSpecベース、中央帯回避配置、regenerate対応）
- `three/InfiniteScrollRenderer.ts` — 3チャンクの3D配置管理（ScrollState→位置反映、リサイクル時regenerate、霧・背景色設定）
- `audio/ProceduralSounds.ts` — Web Audio APIプロシージャル環境音（Rain/Forest/Wind）
- `audio/AudioAdapter.ts` — 再生/停止/音量/ミュート管理
- `audio/SfxPlayer.ts` — MP3ワンショット再生（fetch+decodeAudioData+バッファキャッシュ）

### src/ — エントリ
- `main.ts` — 全モジュール統合・レンダリングループ。起動時に`loadFromStorage()`で設定復元
- `electron.d.ts` — `window.electronAPI`型定義
- `index.html` — HTMLエントリ

### tests/ — 217件
- `domain/timer/PomodoroStateMachine.test.ts` — 47件
- `domain/timer/CyclePlan.test.ts` — 7件
- `domain/character/BehaviorStateMachine.test.ts` — 67件
- `domain/character/GestureRecognizer.test.ts` — 17件
- `domain/environment/SceneConfig.test.ts` — 11件
- `domain/shared/EventBus.test.ts` — 4件
- `application/app-scene/AppSceneManager.test.ts` — 12件
- `application/character/InterpretPrompt.test.ts` — 17件
- `application/environment/ScrollUseCase.test.ts` — 11件
- `application/settings/AppSettingsService.test.ts` — 13件
- `application/timer/TimerSfxBridge.test.ts` — 10件
- `setup.test.ts` — 1件
