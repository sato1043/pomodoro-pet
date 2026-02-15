# AppScene 設計文書

## 概要

AppSceneはアプリケーション全体の動作シーン（画面状態）を管理する仕組みである。ポモドーロタイマーの内部状態（work/break/long-break/congrats）とは独立した上位概念として、アプリケーション層に配置する。

Phase 1〜3の移行により、旧`AppMode`から`AppScene`にリネームされた。旧`congrats`シーンはPomodoroStateMachineの内部フェーズに統合された。

## 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/application/app-scene/AppScene.ts` | 型定義（AppScene, AppSceneEvent） |
| `src/application/app-scene/AppSceneManager.ts` | 状態管理（遷移メソッド群） |
| `tests/application/app-scene/AppSceneManager.test.ts` | テスト（12件） |

## 型定義

### AppScene

```typescript
type AppScene = 'free' | 'pomodoro' | 'settings'
```

| 値 | 意味 | 実装状況 |
|---|---|---|
| `free` | ポモドーロサイクルに入っていない自由な状態 | 実装済み |
| `pomodoro` | ポモドーロサイクル実行中（work/break/long-break/congratsを内包） | 実装済み |
| `settings` | 設定画面 | 型定義のみ（将来実装） |

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

         free ←───→ settings（将来実装）
```

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
 │   ┌────────────┐    ┌──────────┐                            │
 │   │ long-break │───→│ congrats │──→ AppScene=free に遷移    │
 │   └────────────┘    └──────────┘    （5秒自動完了）          │
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
| `pomodoro → free` | `CycleCompleted`イベント | congrats自動完了後、EventBus経由で自動遷移 |

### ガード条件

| 操作 | ガード | 不正遷移時 |
|---|---|---|
| `enterPomodoro()` | `currentScene === 'free'` | 空配列を返す |
| `exitPomodoro()` | `currentScene === 'pomodoro'` | 空配列を返す |

## AppSceneManagerの責務

### インターフェース

```typescript
interface AppSceneManager {
  readonly currentScene: AppScene
  enterPomodoro(): AppSceneEvent[]
  exitPomodoro(): AppSceneEvent[]
  dispose(): void
}
```

### 内部動作

1. `enterPomodoro()` — `currentScene`を`'pomodoro'`に変更、`AppSceneChanged(pomodoro)`を返す
2. `exitPomodoro()` — `currentScene`を`'free'`に変更、`AppSceneChanged(free)`を返す
3. EventBus購読 — `CycleCompleted`を購読し、受信時に`exitPomodoro()`を呼んでイベントをEventBusに発行
4. `dispose()` — EventBus購読を解除

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
- 連携はEventBus + main.tsでの組み立てで実現する
- これにより両者は独立してテスト可能である
- congratsはpomodoro内部フェーズのためAppSceneManagerは関知しない

## イベントフロー

### サイクル完了時

```
PomodoroStateMachine: long-break完了 → PhaseStarted(congrats)
  ├→ TimerCharacterBridge: celebrate プリセット（happy固定）
  ├→ TimerOverlay: switchToMode('congrats') — 祝福UI表示
  └→ TimerSfxBridge: サイクル完了ファンファーレ再生

PomodoroStateMachine: congrats完了（5秒後）
  → CycleCompleted 発行
  → AppSceneManager: exitPomodoro() → AppSceneChanged(free)
    ├→ main.ts: resetTimer()
    ├→ TimerOverlay: switchToMode('free')
    └→ TimerCharacterBridge: autonomous プリセット
```

### 手動離脱時

```
ユーザー: Exitボタン押下
  ↓
AppSceneManager: exitPomodoro()
  ↓
AppSceneChanged(free) 発行
  ├→ main.ts: resetTimer()
  ├→ TimerOverlay: switchToMode('free')
  └→ TimerCharacterBridge: autonomous プリセット
```

## 各シーンの責務

| シーン | UI | キャラクター | タイマー | 音 |
|---|---|---|---|---|
| `free` | 設定UI、Startボタン | autonomous（自由行動） | 停止 | 環境音のみ |
| `pomodoro` | タイマー表示、Pause/Exit | フェーズ別プリセット | 稼働中 | 環境音+SFX |

### pomodoro内部フェーズ別

| フェーズ | キャラクター | 背景 | インタラクション |
|---|---|---|---|
| work | march-cycle（前進サイクル） | march中スクロール | 拒否 |
| break | rest-cycle（happy→sit↔idle） | 静止 | 許可 |
| long-break | joyful-rest（happy→sit→idle→happy） | 静止 | 許可 |
| congrats | celebrate（happy固定） | 静止 | 操作なし |
| (paused) | autonomous（自由行動） | 静止 | 許可 |

## テスト仕様（12件）

| テスト | 期待 |
|---|---|
| 初期状態が `'free'` である | `currentScene === 'free'` |
| `enterPomodoro()` で `'pomodoro'` に遷移する | `currentScene === 'pomodoro'` |
| `enterPomodoro()` が `AppSceneChanged(pomodoro)` イベントを返す | イベント配列を検証 |
| `exitPomodoro()` で `'free'` に遷移する | `currentScene === 'free'` |
| `exitPomodoro()` が `AppSceneChanged(free)` イベントを返す | イベント配列を検証 |
| 既に `'pomodoro'` の時に `enterPomodoro()` は空配列を返す | `events.length === 0` |
| 既に `'free'` の時に `exitPomodoro()` は空配列を返す | `events.length === 0` |
| `CycleCompleted` イベントで自動的に `'free'` に遷移する | EventBus経由で検証 |
| `CycleCompleted` 時に `AppSceneChanged(free)` がEventBusに発行される | 購読で検証 |
| `free` の時に `CycleCompleted` が来ても何もしない | モード不変 |
| `free → pomodoro → free` の全サイクルが動作する | 全遷移の正常動作 |
| `dispose()` 後は `CycleCompleted` に反応しない | EventBus発行後もモード不変 |
