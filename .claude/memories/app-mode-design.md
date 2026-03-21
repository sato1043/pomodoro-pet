# AppScene 設計文書

## 概要

AppSceneはアプリケーション全体の動作シーン（画面状態）を管理する仕組みである。ポモドーロタイマーの内部状態（work/break/long-break/congrats）とは独立した上位概念として、アプリケーション層に配置する。

Phase 1〜3の移行により、旧`AppMode`から`AppScene`にリネームされた。旧`congrats`シーンはPomodoroStateMachineの内部フェーズに統合された。

## 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/application/app-scene/AppScene.ts` | 型定義（AppScene, AppSceneEvent） |
| `src/application/app-scene/AppSceneManager.ts` | 状態管理（遷移メソッド群） |
| `src/application/environment/EnvironmentCoordinator.ts` | 環境設定シーンのcoordinator |
| `tests/application/app-scene/AppSceneManager.test.ts` | テスト（38件） |
| `tests/application/environment/EnvironmentCoordinator.test.ts` | テスト（9件） |

## 型定義

### AppScene

```typescript
type AppScene = 'free' | 'pomodoro' | 'settings' | 'fureai' | 'gallery' | 'environment'
```

| 値 | 意味 | 実装状況 |
|---|---|---|
| `free` | ポモドーロサイクルに入っていない自由な状態 | 実装済み |
| `pomodoro` | ポモドーロサイクル実行中（work/break/long-break/congratsを内包） | 実装済み |
| `settings` | 設定画面 | 型定義のみ（将来実装） |
| `fureai` | ふれあいモード（餌やり） | 実装済み |
| `gallery` | ギャラリーモード（アニメーション確認） | 実装済み |
| `environment` | 環境設定モード（天気・地域・候設定） | 実装済み |

### AppSceneEvent

```typescript
type AppSceneEvent = {
  type: 'AppSceneChanged'
  scene: AppScene
  timestamp: number
}
```

EventBusのトピック `'AppSceneChanged'` で発行される。

## 状態遷移図

### AppScene層（最上位）

```
                    enterPomodoro()
         free ─────────────────────→ pomodoro
          ↑                              │
          │       exitPomodoro()          │
          │       (手動離脱 or            │
          │        congrats自動完了)      │
          └──────────────────────────────┘

         free ←──→ fureai       (enterFureai / exitFureai)
         free ←──→ gallery      (enterGallery / exitGallery)
         free ←──→ environment  (enterEnvironment / exitEnvironment)
         free ←──→ settings     （将来実装）
```

すべてのシーンは`free`を経由して遷移する。シーン間の直接遷移は不可。

### pomodoro内部（PomodoroStateMachine管理）

```
 ┌─────────────────────────────────────────────────────────────┐
 │  pomodoro                                                   │
 │                                                             │
 │   ┌──────┐    ┌───────┐    ┌──────┐    ┌───────┐           │
 │   │ work │───→│ break │───→│ work │───→│ break │──→ ...    │
 │   └──┬───┘    └───────┘    └──────┘    └───────┘           │
 │      │                                                      │
 │      │ (最終セット)                                         │
 │      ↓                                                      │
 │   ┌──────────┐    ┌────────────┐                            │
 │   │ congrats │───→│ long-break │──→ AppScene=free に遷移    │
 │   └──────────┘    └────────────┘    （最終休憩完了後）       │
 │                                                             │
 │   ※ work/break/long-break中はpause/resume可能               │
 │   ※ congrats中はpause/resume/exitManually不可                │
 └─────────────────────────────────────────────────────────────┘
```

### 遷移トリガー

| 遷移 | トリガー | 説明 |
|---|---|---|
| `free → pomodoro` | `enterPomodoro()` | ユーザーがStart Pomodoroボタンを押す |
| `pomodoro → free` | `exitPomodoro()` | ユーザーがExitボタンで手動離脱 |
| `pomodoro → free` | `CycleCompleted`イベント | 最終休憩完了後、PomodoroOrchestrator経由で自動遷移 |
| `free → fureai` | `enterFureai()` | FureaiCoordinator経由 |
| `fureai → free` | `exitFureai()` | FureaiCoordinator経由 |
| `free → gallery` | `enterGallery()` | GalleryCoordinator経由 |
| `gallery → free` | `exitGallery()` | GalleryCoordinator経由 |
| `free → environment` | `enterEnvironment()` | EnvironmentCoordinator経由 |
| `environment → free` | `exitEnvironment()` | EnvironmentCoordinator経由 |

### ガード条件

| 操作 | ガード | 不正遷移時 |
|---|---|---|
| `enterPomodoro()` | `currentScene === 'free'` | 空配列を返す |
| `exitPomodoro()` | `currentScene === 'pomodoro'` | 空配列を返す |
| `enterFureai()` | `currentScene === 'free'` | 空配列を返す |
| `exitFureai()` | `currentScene === 'fureai'` | 空配列を返す |
| `enterGallery()` | `currentScene === 'free'` | 空配列を返す |
| `exitGallery()` | `currentScene === 'gallery'` | 空配列を返す |
| `enterEnvironment()` | `currentScene === 'free'` | 空配列を返す |
| `exitEnvironment()` | `currentScene === 'environment'` | 空配列を返す |

## AppSceneManagerの責務

### インターフェース

```typescript
interface AppSceneManager {
  readonly currentScene: AppScene
  enterPomodoro(): AppSceneEvent[]
  exitPomodoro(): AppSceneEvent[]
  enterFureai(): AppSceneEvent[]
  exitFureai(): AppSceneEvent[]
  enterGallery(): AppSceneEvent[]
  exitGallery(): AppSceneEvent[]
  enterEnvironment(): AppSceneEvent[]
  exitEnvironment(): AppSceneEvent[]
}
```

### 内部動作

1. `enterPomodoro()` — `currentScene`を`'pomodoro'`に変更、`AppSceneChanged(pomodoro)`を返す
2. `exitPomodoro()` — `currentScene`を`'free'`に変更、`AppSceneChanged(free)`を返す
3. EventBus購読 — `CycleCompleted`を購読し、受信時に`exitPomodoro()`を呼んでイベントをEventBusに発行
4. `dispose()` — EventBus購読を解除

## EnvironmentCoordinatorの責務

EnvironmentCoordinatorは環境設定シーンの遷移とカメラ制御を管理する。

```typescript
interface EnvironmentCoordinator {
  enterEnvironment(): void
  exitEnvironment(): void
}
```

### 遷移フロー

```
enterEnvironment():
  1. sceneManager.enterEnvironment() → AppSceneChanged(environment)
  2. bus.publish('WeatherPreviewOpen', { open: true })
     → main.ts: カメラ後退 + march-cycle + autoTime停止

exitEnvironment():
  1. bus.publish('WeatherPreviewOpen', { open: false })
     → main.ts: カメラ復帰 + autonomous + autoTime再開
  2. sceneManager.exitEnvironment() → AppSceneChanged(free)
```

## PomodoroStateMachineとの関係

AppSceneとPomodoroStateMachineは独立している。両者の連携は`main.ts`（組み立て層）の`subscribeAppSceneToSession()`で行う。

```
AppSceneManager                PomodoroStateMachine
     │                              │
     │ enterPomodoro()               │
     │ → AppSceneChanged(pomodoro)  │
     │         │                     │
     │         └──→ main.tsが       │
     │              session.reset()  │
     │              session.start()  │
     │              を呼ぶ           │
     │                               │
     │ CycleCompleted                │
     │ (congrats完了後に発行)        │
     │ → exitPomodoro()             │
     │ → AppSceneChanged(free)      │
     │         │                     │
     │         └──→ main.tsが       │
     │              session.reset()  │
     │              を呼ぶ           │
```

### 設計判断

- AppSceneManagerはPomodoroStateMachineを知らない
- PomodoroStateMachineはAppSceneManagerを知らない
- 連携はPomodoroOrchestratorの直接コールバックで実現する
- これにより両者は独立してテスト可能である
- congratsはpomodoro内部フェーズのためAppSceneManagerは関知しない

## イベントフロー

### サイクル完了時

```
PomodoroStateMachine: 最終work完了 → PhaseStarted(congrats)
  ├→ PomodoroOrchestrator: celebrate プリセット（直接コールバック）
  ├→ OverlayPomodoro: congratsモードに切替 — 祝福UI表示（EventBus経由）
  └→ TimerSfxBridge: サイクル完了ファンファーレ再生（EventBus経由）

PomodoroStateMachine: congrats完了（5秒後） → PhaseStarted(long-break/break)
  → PomodoroOrchestrator: joyful-rest/rest-cycle プリセット（直接コールバック）

PomodoroStateMachine: 最終休憩完了
  → CycleCompleted 発行
  → PomodoroOrchestrator: doExitPomodoro()
    ├→ AppSceneManager.exitPomodoro() → AppSceneChanged(free)（EventBus経由）
    ├→ session.reset()
    └→ onBehaviorChange(autonomous)（直接コールバック）
```

### 手動離脱時

```
ユーザー: Exitボタン押下
  ↓
AppSceneManager: exitPomodoro()
  ↓
AppSceneChanged(free) 発行
  ├→ main.ts: resetTimer()
  ├→ SceneRouter: SceneFreeに切替（EventBus経由）
  └→ TimerCharacterBridge: autonomous プリセット
```

## 各シーンの責務

| シーン | UI | キャラクター | タイマー | 音 |
|---|---|---|---|---|
| `free` | 設定UI、Startボタン | autonomous（自由行動） | 停止 | 環境音のみ |
| `pomodoro` | タイマー表示、Pause/Exit | フェーズ別プリセット | 稼働中 | 環境音+SFX |
| `fureai` | ふれあいUI、餌やり | fureai-idle | 停止 | 環境音のみ |
| `gallery` | アニメーション確認UI | ギャラリー制御 | 停止 | 環境音のみ |
| `environment` | 天気・地域・候設定UI | march-cycle（カメラ後退） | 停止 | 環境音のみ |

### pomodoro内部フェーズ別

| フェーズ | キャラクター | 背景 | インタラクション |
|---|---|---|---|
| work | march-cycle（前進サイクル） | march中スクロール | 拒否 |
| break | rest-cycle（happy→sit↔idle） | 静止 | 許可 |
| long-break | joyful-rest（happy→sit→idle→happy） | 静止 | 許可 |
| congrats | celebrate（happy固定） | 静止 | 操作なし |
| (paused) | autonomous（自由行動） | 静止 | 許可 |

### environment内部ビュー

| ビュー | UI | 説明 |
|---|---|---|
| `weather` | WeatherPanel + KouSelector | 天気・雲量・時間帯・シーンプリセット・候の設定 |
| `worldMap` | WorldMapModal | 地域（緯度経度）の選択。closeでweatherビューに戻る |

## テスト仕様（38件）

AppSceneManager: 38件（初期状態1 + pomodoro enter/exit 5 + fureai enter/exit 6 + gallery enter/exit 6 + environment enter/exit 7 + 全サイクル13）

EnvironmentCoordinator: 9件（enter 4 + exit 4 + 全サイクル1）
