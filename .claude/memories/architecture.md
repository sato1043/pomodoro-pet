# アーキテクチャ

## レイヤー構成（クリーンアーキテクチャ）

```
domain（最内層）← application ← adapters ← infrastructure（最外層）
```

依存方向: 外→内のみ。domainは他の層を知らない。

## モジュール間通信

EventBus（Pub/Sub）で疎結合。AppMode・タイマー・キャラクターはイベント経由で連携。

### イベントフロー

```
AppModeManager → AppModeChanged → TimerCharacterBridge, TimerOverlay
PomodoroSession → TimerEvents → TimerCharacterBridge, TimerOverlay
CycleCompleted → AppModeManager（自動でfreeに遷移）
```

## 4つのドメインコンテキスト

### 1. タイマー
- `PomodoroSession` — セット構造（4セット/サイクル）、長時間休憩（15分）、サイクル完了自動停止
- `TimerPhase` — work / break / long-break の3フェーズ
- `TimerConfig` — 作業時間、休憩時間、長時間休憩時間、セット数
- `TimerEvents` — PhaseStarted, PhaseCompleted, SetCompleted, CycleCompleted, TimerTicked, TimerPaused, TimerReset

### 2. キャラクター
- `Character` — 位置・状態管理
- `BehaviorStateMachine` — 7状態のステートマシン（タイムアウト自動遷移 + プロンプト/インタラクション遷移）。`fixedWanderDirection`オプションでwander方向を固定可能
- `CharacterState` — 状態設定（アニメーション名、持続時間範囲、ループ有無）

### 3. 環境
- `SceneConfig` — 進行方向、スクロール速度、状態別スクロール有無
- `ChunkSpec` — チャンク寸法（幅・奥行き）とオブジェクト配置数（木・草・岩・花）
- `shouldScroll()` — 現在の状態でスクロールすべきか判定する純粋関数
- `SceneObject` — シーンオブジェクト型定義

### 4. 共有
- `EventBus` — Pub/Subイベントバス。タイマーとキャラクター間を疎結合に連携

## ファイルマップ

### desktop/ — Electronプロセス
- `main/index.ts` — メインプロセス（BrowserWindow生成、dev/prod切替）
- `preload/index.ts` — contextBridge（platform情報公開）

### src/domain/ — ドメインモデル
- `timer/entities/PomodoroSession.ts` — タイマー中核ロジック
- `timer/value-objects/TimerPhase.ts` — work/break/long-breakフェーズ
- `timer/value-objects/TimerConfig.ts` — 設定（デフォルト25分/5分/15分長時間休憩/4セット）
- `timer/events/TimerEvents.ts` — イベント型定義
- `character/entities/Character.ts` — キャラクターエンティティ
- `character/services/BehaviorStateMachine.ts` — 行動AIステートマシン（fixedWanderDirection対応）
- `character/value-objects/CharacterState.ts` — 7状態定義+設定
- `character/value-objects/Position3D.ts` — 3D位置
- `environment/value-objects/SceneConfig.ts` — SceneConfig, ChunkSpec, shouldScroll()
- `environment/value-objects/SceneObject.ts` — シーンオブジェクト型
- `shared/EventBus.ts` — Pub/Subイベントバス

### src/application/ — ユースケース
- `app-mode/AppMode.ts` — AppMode型定義（free/pomodoro）とAppModeEvent型
- `app-mode/AppModeManager.ts` — アプリケーションモード管理（enterPomodoro/exitPomodoro）。CycleCompleted購読で自動遷移
- `timer/TimerUseCases.ts` — start/pause/reset/tick
- `character/InterpretPromptUseCase.ts` — キーワードマッチング（英語/日本語→行動）
- `character/UpdateBehaviorUseCase.ts` — 毎フレームtick（StateMachine遷移 + ScrollManager経由で背景スクロール制御）
- `environment/ScrollUseCase.ts` — チャンク位置計算・リサイクル判定（Three.js非依存）
- `character/TimerCharacterBridge.ts` — タイマーイベント→キャラクター行動連携 + AppModeChanged購読

### src/adapters/ — UIとThree.jsアダプター
- `three/ThreeCharacterAdapter.ts` — FBX/プレースホルダー統合キャラクター表示
- `three/ThreeInteractionAdapter.ts` — Raycasterベースのホバー/クリック/摘まみ上げ（Y軸持ち上げ）
- `ui/TimerOverlay.ts` — タイマーUI（右上、半透明パネル）
- `ui/PromptInput.ts` — プロンプト入力（下部中央）
- `ui/AudioControls.ts` — 環境音コントロール（右下）

### src/infrastructure/ — フレームワーク・ドライバ
- `three/FBXModelLoader.ts` — FBXLoaderラッパー
- `three/AnimationController.ts` — AnimationMixer管理、crossFade
- `three/PlaceholderCharacter.ts` — プリミティブ人型キャラクター+6種アニメーション
- `three/EnvironmentBuilder.ts` — 旧・単一シーン環境生成（InfiniteScrollRendererに置換済み）
- `three/EnvironmentChunk.ts` — 1チャンク分の環境オブジェクト生成（ChunkSpecベース、中央帯回避配置、regenerate対応）
- `three/InfiniteScrollRenderer.ts` — 3チャンクの3D配置管理（ScrollState→位置反映、リサイクル時regenerate、霧・背景色設定）
- `audio/ProceduralSounds.ts` — Web Audio APIプロシージャル環境音（Rain/Forest/Wind）
- `audio/AudioAdapter.ts` — 再生/停止/音量/ミュート管理

### src/ — エントリ
- `main.ts` — 全モジュール統合・レンダリングループ
- `index.html` — HTMLエントリ

### tests/
- `domain/timer/PomodoroSession.test.ts` — 29件
- `domain/character/BehaviorStateMachine.test.ts` — 21件
- `domain/environment/SceneConfig.test.ts` — 10件
- `domain/shared/EventBus.test.ts` — 4件
- `application/app-mode/AppModeManager.test.ts` — AppModeManager テスト
- `application/character/InterpretPrompt.test.ts` — 14件
- `application/environment/ScrollUseCase.test.ts` — 11件
- `setup.test.ts` — 1件
