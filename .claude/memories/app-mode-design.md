# AppMode 設計文書

## 概要

AppModeはアプリケーション全体の動作モードを管理する仕組みである。ポモドーロタイマーの内部状態（work/break/long-break）とは独立した上位概念として、アプリケーション層に配置する。

## 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/application/app-mode/AppMode.ts` | 型定義（AppMode, AppModeEvent） |
| `src/application/app-mode/AppModeManager.ts` | 状態管理（enterPomodoro/exitPomodoro） |
| `tests/application/app-mode/AppModeManager.test.ts` | テスト |

## 型定義

### AppMode

```typescript
type AppMode = 'free' | 'pomodoro'
```

| 値 | 意味 |
|---|---|
| `free` | ポモドーロサイクルに入っていない自由な状態 |
| `pomodoro` | ポモドーロサイクル実行中 |

### AppModeEvent

```typescript
type AppModeEvent = {
  type: 'AppModeChanged'
  mode: AppMode
  timestamp: number
}
```

EventBusのトピック `'AppModeChanged'` で発行される。

## 状態遷移

```
              enterPomodoro()
    free ─────────────────────→ pomodoro
      ↑                             │
      │  exitPomodoro()              │
      │  (手動)                      │
      ├─────────────────────────────┤
      │                              │
      │  CycleCompleted              │
      │  (自動)                      │
      └──────────────────────────────┘
```

### 遷移トリガー

| 遷移 | トリガー | 説明 |
|---|---|---|
| `free → pomodoro` | `enterPomodoro()` | ユーザーがStart Pomodoroボタンを押す |
| `pomodoro → free` | `exitPomodoro()` | ユーザーがExit Pomodoroボタンを押す |
| `pomodoro → free` | `CycleCompleted`イベント | 1サイクル完了時に自動遷移 |

### ガード条件

- `enterPomodoro()`: 現在`free`の時のみ遷移する。`pomodoro`の時は何もしない
- `exitPomodoro()`: 現在`pomodoro`の時のみ遷移する。`free`の時は何もしない

## AppModeManagerの責務

### インターフェース

```typescript
interface AppModeManager {
  readonly currentMode: AppMode
  enterPomodoro(): AppModeEvent[]
  exitPomodoro(): AppModeEvent[]
  dispose(): void
}
```

### 内部動作

1. `enterPomodoro()`
   - `currentMode`を`'pomodoro'`に変更
   - `AppModeChanged { mode: 'pomodoro' }` イベントを返す

2. `exitPomodoro()`
   - `currentMode`を`'free'`に変更
   - `AppModeChanged { mode: 'free' }` イベントを返す

3. EventBus購読
   - `CycleCompleted` イベントを購読する
   - 受信時に `exitPomodoro()` を呼び、返されたイベントをEventBusに発行する

4. `dispose()`
   - EventBus購読を解除する

## PomodoroSessionとの関係

AppModeとPomodoroSessionは独立している。両者の連携は`main.ts`（組み立て層）で行う。

```
AppModeManager                PomodoroSession
     │                              │
     │ enterPomodoro()               │
     │ → AppModeChanged(pomodoro)    │
     │         │                     │
     │         └──→ main.tsが       │
     │              session.start()  │
     │              を呼ぶ           │
     │                               │
     │ exitPomodoro()                │
     │ → AppModeChanged(free)       │
     │         │                     │
     │         └──→ main.tsが       │
     │              session.reset()  │
     │              を呼ぶ           │
```

### 設計判断

- AppModeManagerはPomodoroSessionを知らない
- PomodoroSessionはAppModeManagerを知らない
- 連携はEventBus + main.ts での組み立てで実現する
- これにより両者は独立してテスト可能である

## キャラクター連携

`TimerCharacterBridge`が`AppModeChanged`を追加購読する。

| イベント | 条件 | キャラクター動作 |
|---|---|---|
| `AppModeChanged` | `mode === 'free'` | `scrollingAllowed=false` + idle |
| `AppModeChanged` | `mode === 'pomodoro'` | 連携不要（直後のPhaseStartedで制御される） |

`AppModeChanged(pomodoro)` → `PomodoroSession.start()` → `PhaseStarted(work)` → wander という流れになるため、pomodoroへの遷移時にTimerCharacterBridge側でキャラクター操作する必要はない。

## UIの振る舞い（TimerOverlay）

### freeモード

- タイマー詳細（Set情報、残り時間、フロー説明、進捗ドット）を非表示にする
- 「Start Pomodoro」ボタンのみを表示する
- Pause/Resetボタンは非表示

### pomodoroモード

- タイマーUI全体を表示する（現在の実装と同等）
- 「Exit Pomodoro」ボタンを追加する（Resetの代わり、またはResetと併置）
- Start → Pause/Resume の操作は従来通り

### モード遷移時の表示切替

- `AppModeChanged` を購読し、UIを切り替える

## テスト仕様

### AppModeManager テスト

| テスト | 期待 |
|---|---|
| 初期状態が `'free'` である | `currentMode === 'free'` |
| `enterPomodoro()` で `'pomodoro'` に遷移する | `currentMode === 'pomodoro'` |
| `enterPomodoro()` が `AppModeChanged(pomodoro)` イベントを返す | イベント配列を検証 |
| `exitPomodoro()` で `'free'` に遷移する | `currentMode === 'free'` |
| `exitPomodoro()` が `AppModeChanged(free)` イベントを返す | イベント配列を検証 |
| 既に `'pomodoro'` の時に `enterPomodoro()` は空配列を返す | `events.length === 0` |
| 既に `'free'` の時に `exitPomodoro()` は空配列を返す | `events.length === 0` |
| `CycleCompleted` イベントで自動的に `'free'` に遷移する | EventBus経由で検証 |
| `CycleCompleted` 時に `AppModeChanged(free)` がEventBusに発行される | EventBus購読で検証 |
| `dispose()` 後は `CycleCompleted` に反応しない | EventBus発行後もモード不変 |
