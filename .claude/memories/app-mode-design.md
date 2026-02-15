# AppMode 設計文書

## 概要

AppModeはアプリケーション全体の動作モード（シーン）を管理する仕組みである。ポモドーロタイマーの内部状態（work/break/long-break）とは独立した上位概念として、アプリケーション層に配置する。

## 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/application/app-mode/AppMode.ts` | 型定義（AppMode, AppModeEvent） |
| `src/application/app-mode/AppModeManager.ts` | 状態管理（遷移メソッド群） |
| `tests/application/app-mode/AppModeManager.test.ts` | テスト |

## 型定義

### AppMode

```typescript
type AppMode = 'free' | 'pomodoro' | 'congrats'
```

| 値 | 意味 |
|---|---|
| `free` | ポモドーロサイクルに入っていない自由な状態 |
| `pomodoro` | ポモドーロサイクル実行中 |
| `congrats` | サイクル完了後の祝福演出中 |

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
            free ─────────────────────────→ pomodoro
             ↑                                  │
             │                                  │ exitPomodoro()
             │                                  │ (手動離脱)
             │          ┌───────────────────────┘
             │          │
             │          │   CycleCompleted (自動)
             │          │
             │          ↓
             │       congrats
             │          │
             │          │ dismissCongrats()
             │          │ (自動タイムアウト or クリック)
             └──────────┘
```

### 遷移トリガー

| 遷移 | トリガー | 説明 |
|---|---|---|
| `free → pomodoro` | `enterPomodoro()` | ユーザーがStart Pomodoroボタンを押す |
| `pomodoro → free` | `exitPomodoro()` | ユーザーがExitボタンで手動離脱（途中離脱） |
| `pomodoro → congrats` | `CycleCompleted`イベント | 全セット完了時に自動遷移 |
| `congrats → free` | `dismissCongrats()` | 自動タイムアウト（数秒）またはクリック |

### ガード条件

| 操作 | ガード | 不正遷移時 |
|---|---|---|
| `enterPomodoro()` | `currentMode === 'free'` | 空配列を返す |
| `exitPomodoro()` | `currentMode === 'pomodoro'` | 空配列を返す |
| `completeCycle()` | `currentMode === 'pomodoro'` | 空配列を返す |
| `dismissCongrats()` | `currentMode === 'congrats'` | 空配列を返す |

## AppModeManagerの責務

### インターフェース

```typescript
interface AppModeManager {
  readonly currentMode: AppMode
  enterPomodoro(): AppModeEvent[]    // free → pomodoro
  exitPomodoro(): AppModeEvent[]     // pomodoro → free（手動離脱）
  completeCycle(): AppModeEvent[]    // pomodoro → congrats（サイクル完了）
  dismissCongrats(): AppModeEvent[]  // congrats → free（祝福終了）
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

3. `completeCycle()`
   - `currentMode`を`'congrats'`に変更
   - `AppModeChanged { mode: 'congrats' }` イベントを返す

4. `dismissCongrats()`
   - `currentMode`を`'free'`に変更
   - `AppModeChanged { mode: 'free' }` イベントを返す

5. EventBus購読
   - `CycleCompleted` イベントを購読する
   - 受信時に `completeCycle()` を呼び、返されたイベントをEventBusに発行する
   - （旧: `exitPomodoro()` を呼んでいた → `completeCycle()` に変更）

6. `dispose()`
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
     │ completeCycle()               │
     │ → AppModeChanged(congrats)   │
     │         │                     │
     │         └──→ main.tsが       │
     │              session.reset()  │
     │              を呼ぶ           │
     │                               │
     │ dismissCongrats()             │
     │ → AppModeChanged(free)       │
     │         │                     │
     │         └──→ main.ts:        │
     │              追加処理なし     │
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

## イベントフロー

### サイクル完了時

```
PomodoroSession: CycleCompleted 発行
  ↓
AppModeManager: completeCycle()
  ↓
AppModeChanged(congrats) 発行
  ├→ main.ts: resetTimer()
  ├→ TimerOverlay: switchToMode('congrats') — 祝福UI表示
  ├→ TimerCharacterBridge: happy アニメーション
  └→ TimerSfxBridge: サイクル完了SFX再生

数秒後 or クリック
  ↓
AppModeManager: dismissCongrats()
  ↓
AppModeChanged(free) 発行
  ├→ TimerOverlay: switchToMode('free')
  └→ TimerCharacterBridge: idle
```

### 手動離脱時

```
ユーザー: Exitボタン押下
  ↓
AppModeManager: exitPomodoro()
  ↓
AppModeChanged(free) 発行
  ├→ main.ts: resetTimer()
  ├→ TimerOverlay: switchToMode('free')
  └→ TimerCharacterBridge: idle
```

## 各シーンの責務

| シーン | UI | キャラクター | タイマー | 音 |
|---|---|---|---|---|
| `free` | 設定UI表示、Startボタン | 自由行動(idle/wander/sit等) | 停止 | 環境音のみ |
| `pomodoro` | タイマー表示、Pause/Exit | work=march(前進)、break=idle(自律遷移でwander等) | 稼働中 | 環境音+work完了ファンファーレ |
| `congrats` | 祝福メッセージ、紙吹雪 | happy(lockState) | 停止 | サイクル完了ファンファーレ |

## キャラクター連携

`TimerCharacterBridge`が`AppModeChanged`を購読する。

| イベント | 条件 | キャラクター動作 |
|---|---|---|
| `AppModeChanged` | `mode === 'free'` | `scrollingAllowed=false` + idle |
| `AppModeChanged` | `mode === 'pomodoro'` | 連携不要（直後のPhaseStartedで制御される） |
| `AppModeChanged` | `mode === 'congrats'` | `scrollingAllowed=false` + happy |

`AppModeChanged(pomodoro)` → `PomodoroSession.start()` → `PhaseStarted(work)` → march（lockState付き）という流れになるため、pomodoroへの遷移時にTimerCharacterBridge側でキャラクター操作する必要はない。

## SFX連携

`TimerSfxBridge`が`AppModeChanged`を追加購読する。

| イベント | 条件 | SFX |
|---|---|---|
| `PhaseCompleted` | `phase === 'work'` | ファンファーレ（既存） |
| `AppModeChanged` | `mode === 'congrats'` | サイクル完了ファンファーレ（新規） |

## UIの振る舞い（TimerOverlay）

### freeモード

- タイマー設定UI（Work/Break/LongBreak/Sets ボタングループ）を表示
- タイムラインサマリー（折りたたみ時）を表示
- 「Start Pomodoro」ボタンを表示
- Pause/Resetボタンは非表示

### pomodoroモード

- タイマーUI全体を表示（Set情報、残り時間、フロー説明、進捗ドット）
- 「Exit Pomodoro」ボタンを表示
- Start → Pause/Resume の操作は従来通り

### congratsモード

- 祝福メッセージを中央に表示
- 紙吹雪等のビジュアルエフェクト
- 数秒で自動フェードアウト、またはクリックで閉じる
- 閉じた時に `dismissCongrats()` を呼ぶ

### モード遷移時の表示切替

- `AppModeChanged` を購読し、3モードのUIを切り替える

## congrats自動dismiss

congratsモードには自動タイムアウトがある。`main.ts`の組み立て層でタイマーを管理する。

```typescript
// main.ts での congrats 自動dismiss
bus.subscribe<AppModeEvent>('AppModeChanged', (event) => {
  if (event.mode === 'congrats') {
    setTimeout(() => {
      if (appModeManager.currentMode === 'congrats') {
        const events = appModeManager.dismissCongrats()
        for (const e of events) bus.publish(e.type, e)
      }
    }, CONGRATS_DURATION_MS) // 例: 5000ms
  }
})
```

TimerOverlayのクリック操作でも `dismissCongrats()` を呼べるようにする。どちらが先に発火しても、ガード条件により二重遷移は発生しない。

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
| `completeCycle()` で `'congrats'` に遷移する | `currentMode === 'congrats'` |
| `completeCycle()` が `AppModeChanged(congrats)` イベントを返す | イベント配列を検証 |
| 既に `'congrats'` の時に `completeCycle()` は空配列を返す | `events.length === 0` |
| `dismissCongrats()` で `'free'` に遷移する | `currentMode === 'free'` |
| `dismissCongrats()` が `AppModeChanged(free)` イベントを返す | イベント配列を検証 |
| 既に `'free'` の時に `dismissCongrats()` は空配列を返す | `events.length === 0` |
| `CycleCompleted` イベントで自動的に `'congrats'` に遷移する | EventBus経由で検証 |
| `CycleCompleted` 時に `AppModeChanged(congrats)` がEventBusに発行される | EventBus購読で検証 |
| `dispose()` 後は `CycleCompleted` に反応しない | EventBus発行後もモード不変 |

## 将来の拡張性

この設計は新しいシーンの追加に対して開放的である。

- `AppMode`のユニオン型に値を追加するだけで新シーンを定義可能
- `AppModeManager`に遷移メソッドを追加し、ガード条件を設定する
- 各購読先は`AppModeChanged`のmode値で分岐するだけ

例: `statistics` シーンを追加する場合
```
free → statistics → free
```
`AppMode = 'free' | 'pomodoro' | 'congrats' | 'statistics'` とし、対応する遷移メソッドを追加するだけで対応可能。

## 変更影響範囲

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/application/app-mode/AppMode.ts` | 型変更 | `'congrats'`を追加 |
| `src/application/app-mode/AppModeManager.ts` | メソッド追加・購読変更 | `completeCycle()`, `dismissCongrats()` 追加。CycleCompleted購読先を変更 |
| `tests/application/app-mode/AppModeManager.test.ts` | テスト追加 | congrats関連テスト追加 |
| `src/adapters/ui/TimerOverlay.ts` | UI追加 | congratsモードUI追加 |
| `src/application/character/TimerCharacterBridge.ts` | 分岐追加 | congrats時happyアニメーション |
| `src/application/timer/TimerSfxBridge.ts` | 購読追加 | congrats時SFX再生 |
| `src/main.ts` | 組み立て変更 | congrats自動dismiss、AppModeChanged購読の分岐追加 |
