# ポモドーロタイマー状態遷移設計

## AppModeとの関係

ポモドーロタイマーはAppModeが`pomodoro`の時のみ有効である。

```
AppMode: free ──enterPomodoro()──→ pomodoro ──exitPomodoro()/CycleCompleted──→ free
                                      │
                                      ↓
                              PomodoroSession が有効
                              work → break → work → ... → long-break → CycleCompleted
```

- AppMode `free` → PomodoroSessionの状態は無関係。タイマーUIは非表示
- AppMode `pomodoro` → PomodoroSessionが動作中。タイマーUIが表示される
- `CycleCompleted` 発生時、AppModeManagerが自動的に `free` に遷移する

詳細: [app-mode-design.md](app-mode-design.md)

## 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/domain/timer/entities/PomodoroSession.ts` | タイマー中核ロジック |
| `src/domain/timer/value-objects/TimerPhase.ts` | フェーズ型定義（work/break/long-break） |
| `src/domain/timer/value-objects/TimerConfig.ts` | 設定値（時間・セット数） |
| `src/domain/timer/events/TimerEvents.ts` | イベント型定義 |
| `src/application/timer/TimerUseCases.ts` | start/pause/reset/tick → EventBus発行 |
| `src/application/character/TimerCharacterBridge.ts` | タイマーイベント → キャラクター行動連携 |

## サイクル構造

1サイクル = N セット（デフォルト N=4）

各セットは `work → break` のペアで構成される。最終セットのみ `work → long-break` になる。

### デフォルト設定値

| パラメータ | 値 |
|---|---|
| work | 25分（1,500,000ms） |
| break | 5分（300,000ms） |
| long-break | 15分（900,000ms） |
| setsPerCycle | 4 |

### デバッグ短縮モード（`VITE_DEBUG_TIMER=1`）

| パラメータ | 値 |
|---|---|
| work | 5秒 |
| break | 3秒 |
| long-break | 4秒 |

## フェーズ遷移

### 遷移規則（`nextPhase()`）

```
work完了:
  currentSet < setsPerCycle → break
  currentSet >= setsPerCycle → long-break

break完了:
  completedSetsInCycle++
  SetCompleted発行
  currentSet++
  → work

long-break完了:
  completedSetsInCycle++
  SetCompleted発行
  completedCycles++
  CycleCompleted発行
  currentSet = 1
  completedSetsInCycle = 0
  isRunning = false（自動停止）
  → work（次サイクル初期状態）
```

### デフォルト4セットの具体的なフロー

```
Set 1: work(25m) → break(5m)       → SetCompleted
Set 2: work(25m) → break(5m)       → SetCompleted
Set 3: work(25m) → break(5m)       → SetCompleted
Set 4: work(25m) → long-break(15m) → SetCompleted → CycleCompleted → 自動停止
```

## PomodoroSession状態

| プロパティ | 型 | 説明 |
|---|---|---|
| currentPhase | TimerPhase | 現在のフェーズ（type + durationMs） |
| isRunning | boolean | タイマー動作中か |
| elapsedMs | number | 現フェーズでの経過時間 |
| remainingMs | number | 現フェーズでの残り時間（算出値） |
| completedCycles | number | 完了したサイクル数 |
| currentSet | number | 現在のセット番号（1始まり） |
| totalSets | number | 1サイクルあたりのセット数 |
| completedSets | number | 現サイクルで完了したセット数 |

## 操作とイベント

### 操作一覧

| 操作 | メソッド | 前提条件 |
|---|---|---|
| 開始 | `start()` | `isRunning === false` |
| 一時停止 | `pause()` | `isRunning === true` |
| リセット | `reset()` | なし |
| 時間経過 | `tick(deltaMs)` | `isRunning === true` |

### イベント型

```typescript
type TimerEvent =
  | { type: 'PhaseStarted'; phase: PhaseType; timestamp: number }
  | { type: 'PhaseCompleted'; phase: PhaseType; timestamp: number }
  | { type: 'SetCompleted'; setNumber: number; totalSets: number; timestamp: number }
  | { type: 'CycleCompleted'; cycleNumber: number; timestamp: number }
  | { type: 'TimerTicked'; remainingMs: number }
  | { type: 'TimerPaused'; elapsedMs: number }
  | { type: 'TimerReset' }
```

### 各操作のイベント発行

| 操作 | 発行イベント |
|---|---|
| `start()` | `PhaseStarted` |
| `tick()` 毎フレーム | `TimerTicked`（＋フェーズ完了時は下記参照） |
| `pause()` | `TimerPaused` |
| `reset()` | `TimerReset` |

### フェーズ完了時のイベント発行順序

1. `PhaseCompleted`（完了したフェーズのtype）
2. 条件により `SetCompleted`（break/long-break完了時）
3. 条件により `CycleCompleted`（long-break完了時）
4. `PhaseStarted`（次フェーズのtype）

**注意**: `SetCompleted`は`break`完了時と`long-break`完了時に発行される。`work`完了時ではない。

## キャラクター連携（TimerCharacterBridge）

EventBus経由でタイマーイベントとAppModeイベントを購読し、キャラクター行動に変換する。

| 購読イベント | 条件 | キャラクター動作 |
|---|---|---|
| `AppModeChanged` | mode === 'free' | `scrollingAllowed=false` + idle |
| `PhaseStarted` | phase === 'work' | `scrollingAllowed=true` + wander |
| `PhaseStarted` | phase === 'break' or 'long-break' | `scrollingAllowed=false` + idle |
| `PhaseCompleted` | phase === 'work' | happy |
| `TimerPaused` | — | `scrollingAllowed=false` + idle |
| `TimerReset` | — | `scrollingAllowed=false` + idle |

### scrollingAllowedの意味

`BehaviorStateMachine`の`scrollingAllowed`フラグは、自律遷移でwander（歩行=スクロール状態）へ遷移してよいかを制御する。

- `true`: idle→timeout→wander に遷移できる。背景がスクロールする
- `false`: idle→timeout→**sit**（wanderをスキップ）。背景は静止する

## 実装上の注意点

### 1. tick()のwhileループ

`tick()`は`elapsedMs >= durationMs`の間whileループする。1フレームで複数フェーズをまたぐケース（デバッグ短縮モードで大きなdeltaMs等）に対応している。overflow（超過分）は次フェーズに繰り越される。

### 2. サイクル完了の自動停止

`long-break`完了時に`isRunning=false`を設定する。次サイクルを開始するにはユーザーが再度`start()`を呼ぶ必要がある。`currentPhase`は`work`に設定されるため、再開すると次サイクルのSet 1から始まる。

### 3. reset()の影響範囲

全状態を初期値に戻す: `work`フェーズ・`set=1`・`completedCycles=0`・`completedSetsInCycle=0`・`isRunning=false`・`elapsedMs=0`。

### 4. イベントは配列で返される

各操作は`TimerEvent[]`を返す。`tick()`ではフェーズ完了時に複数イベントが1回の呼び出しで返されることがある。`TimerUseCases`がこの配列を順番にEventBusへpublishする。
