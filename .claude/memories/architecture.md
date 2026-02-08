# アーキテクチャ

## レイヤー構成（クリーンアーキテクチャ）

```
domain（最内層）← application ← adapters ← infrastructure（最外層）
```

依存方向: 外→内のみ。domainは他の層を知らない。

## モジュール間通信

EventBus（Pub/Sub）で疎結合。タイマーとキャラクターはイベント経由で連携。

## 3つのドメインコンテキスト

### 1. タイマー
- `PomodoroSession` — 状態管理（作業/休憩フェーズ、経過時間、サイクル）
- `TimerPhase` / `TimerConfig` — 値オブジェクト
- `TimerEvents` — PhaseStarted, PhaseCompleted, TimerTicked, TimerPaused, TimerReset

### 2. キャラクター
- `Character` — 位置・状態管理
- `BehaviorStateMachine` — 7状態のステートマシン（タイムアウト自動遷移 + プロンプト/インタラクション遷移）
- `CharacterState` — 状態設定（アニメーション名、持続時間範囲、ループ有無）

### 3. 環境
- `SceneObject` — シーンオブジェクト型定義

## ファイルマップ

### desktop/ — Electronプロセス
- `main/index.ts` — メインプロセス（BrowserWindow生成、dev/prod切替）
- `preload/index.ts` — contextBridge（platform情報公開）

### src/domain/ — ドメインモデル
- `timer/entities/PomodoroSession.ts` — タイマー中核ロジック
- `timer/value-objects/TimerPhase.ts` — work/breakフェーズ
- `timer/value-objects/TimerConfig.ts` — 設定（デフォルト25分/5分）
- `timer/events/TimerEvents.ts` — イベント型定義
- `character/entities/Character.ts` — キャラクターエンティティ
- `character/services/BehaviorStateMachine.ts` — 行動AIステートマシン
- `character/value-objects/CharacterState.ts` — 7状態定義+設定
- `character/value-objects/Position3D.ts` — 3D位置
- `environment/value-objects/SceneObject.ts` — シーンオブジェクト型
- `shared/EventBus.ts` — Pub/Subイベントバス

### src/application/ — ユースケース
- `timer/TimerUseCases.ts` — start/pause/reset/tick
- `character/InterpretPromptUseCase.ts` — キーワードマッチング（英語/日本語→行動）
- `character/UpdateBehaviorUseCase.ts` — 毎フレームtick（移動・回転反映）
- `character/TimerCharacterBridge.ts` — タイマーイベント→キャラクター行動連携

### src/adapters/ — UIとThree.jsアダプター
- `three/ThreeCharacterAdapter.ts` — FBX/プレースホルダー統合キャラクター表示
- `three/ThreeInteractionAdapter.ts` — Raycasterベースのホバー/クリック/ドラッグ
- `ui/TimerOverlay.ts` — タイマーUI（右上、半透明パネル）
- `ui/PromptInput.ts` — プロンプト入力（下部中央）
- `ui/AudioControls.ts` — 環境音コントロール（右下）

### src/infrastructure/ — フレームワーク・ドライバ
- `three/FBXModelLoader.ts` — FBXLoaderラッパー
- `three/AnimationController.ts` — AnimationMixer管理、crossFade
- `three/PlaceholderCharacter.ts` — プリミティブ人型キャラクター+6種アニメーション
- `three/EnvironmentBuilder.ts` — 地面/木/草/岩/花/霧の生成
- `audio/ProceduralSounds.ts` — Web Audio APIプロシージャル環境音（Rain/Forest/Wind）
- `audio/AudioAdapter.ts` — 再生/停止/音量/ミュート管理

### src/ — エントリ
- `main.ts` — 全モジュール統合・レンダリングループ
- `index.html` — HTMLエントリ

### tests/ — 50テスト
- `domain/timer/PomodoroSession.test.ts` — 13件
- `domain/character/BehaviorStateMachine.test.ts` — 18件
- `domain/shared/EventBus.test.ts` — 4件
- `application/character/InterpretPrompt.test.ts` — 14件
- `setup.test.ts` — 1件
