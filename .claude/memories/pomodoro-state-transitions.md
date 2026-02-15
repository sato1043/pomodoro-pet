# ポモドーロタイマー状態遷移設計

## AppModeとの関係

ポモドーロタイマーはAppModeが`pomodoro`の時のみ有効である。

```
              enterPomodoro()
   free ─────────────────────→ pomodoro
    ↑                               │
    │ exitPomodoro()                 │ CycleCompleted (自動)
    │ (手動離脱)                     │
    │         ┌─────────────────────┘
    │         ↓
    │      congrats
    │         │ dismissCongrats()
    │         │ (5秒タイムアウト or クリック)
    └─────────┘

                                 pomodoro 内部:
                                 work → break → work → ... → long-break → CycleCompleted
```

- AppMode `free` → PomodoroSessionの状態は無関係。タイマーUIは非表示
- AppMode `pomodoro` → PomodoroSessionが動作中。タイマーUIが表示される
- AppMode `congrats` → サイクル完了の祝福演出中。タイマーは停止済み
- `CycleCompleted` 発生時、AppModeManagerが自動的に `congrats` に遷移する
- `congrats` は5秒で自動dismiss、またはクリックで `free` に遷移する

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

通常のフェーズ完了時:
1. `PhaseCompleted`（完了したフェーズのtype）
2. 条件により `SetCompleted`（break/long-break完了時）
3. `PhaseStarted`（次フェーズのtype）

サイクル完了時（long-break完了）:
1. `PhaseCompleted(long-break)`
2. `SetCompleted`
3. `CycleCompleted`
4. **`PhaseStarted`は発行しない**（`isRunning=false`のため）

次回`start()`が呼ばれたときに`PhaseStarted(work)`が発行される。

**注意**: `SetCompleted`は`break`完了時と`long-break`完了時に発行される。`work`完了時ではない。

## キャラクター連携（TimerCharacterBridge）

EventBus経由でタイマーイベントとAppModeイベントを購読し、キャラクター行動に変換する。

| 購読イベント | 条件 | キャラクター動作 |
|---|---|---|
| `AppModeChanged` | mode === 'free' | `unlockState()` + `scrollingAllowed=false` + idle |
| `AppModeChanged` | mode === 'congrats' | `scrollingAllowed=false` + `lockState('happy')` + happy |
| `PhaseStarted` | phase === 'work' | `scrollingAllowed=true` + march（以後idle↔marchサイクル） |
| `PhaseStarted` | phase === 'break' or 'long-break' | `unlockState()` + `scrollingAllowed=false` + idle |
| `PhaseCompleted` | phase === 'work' | happy |
| `TimerPaused` | — | `unlockState()` + `scrollingAllowed=false` + idle |
| `TimerReset` | — | `unlockState()` + `scrollingAllowed=false` + idle |

### marchとwanderの使い分け

- `march`（前進）: work中にキャラクターが目的を持って歩く状態。`scrolling: true`で背景がスクロールする。タイムアウトでidleに遷移し一息つき、idleタイムアウトでmarchに復帰する（`resolveTimeoutTarget`でwander→march昇格）。結果として`march → idle → march → idle → ...`のサイクルで「頑張って歩いている」振る舞いになる
- `wander`（うろつき）: break/free中にキャラクターがふらふら歩く状態。`scrolling: false`で背景は静止する。自律遷移で`idle → wander → sit → idle`のサイクルに含まれる

### scrollingAllowedの意味

`BehaviorStateMachine`の`scrollingAllowed`フラグは、scrolling状態（`march`）への自律遷移を許可するかを制御する。

- `true`: marchへのプロンプト遷移が有効。TimerCharacterBridgeがwork開始時にセットする
- `false`: marchへの自律遷移が抑制される。break/free時にセットする

`wander`は`scrolling: false`のため、scrollingAllowedの影響を受けない。常に自律遷移で到達可能である

## 実装上の注意点

### 1. tick()のwhileループ

`tick()`は`elapsedMs >= durationMs`の間whileループする。1フレームで複数フェーズをまたぐケース（デバッグ短縮モードで大きなdeltaMs等）に対応している。overflow（超過分）は次フェーズに繰り越される。

### 2. サイクル完了の自動停止とPhaseStarted抑制

`long-break`完了時に`isRunning=false`を設定する。次サイクルを開始するにはユーザーが再度`start()`を呼ぶ必要がある。`currentPhase`は`work`に設定されるため、再開すると次サイクルのSet 1から始まる。

**重要**: サイクル完了時（`isRunning=false`設定後）は`PhaseStarted`を発行しない。これはイベントの同期的な処理順序に起因する問題を防ぐための設計判断である。

もし発行した場合のイベント連鎖:
```
CycleCompleted
  → AppModeManager: exitPomodoro() → AppModeChanged(free)
    → TimerCharacterBridge: scrollingAllowed=false + idle ✓
PhaseStarted(work)  ← CycleCompletedと同じtick()のイベント配列に含まれている
  → TimerCharacterBridge: scrollingAllowed=true + wander ✗ (AppMode=freeなのに歩く)
```

`PhaseStarted`を抑制することで、AppMode=free時にキャラクターがscrolling状態に入ることを防ぐ。

### 3. reset()の影響範囲

全状態を初期値に戻す: `work`フェーズ・`set=1`・`completedCycles=0`・`completedSetsInCycle=0`・`isRunning=false`・`elapsedMs=0`。

### 4. イベントは配列で返される

各操作は`TimerEvent[]`を返す。`tick()`ではフェーズ完了時に複数イベントが1回の呼び出しで返されることがある。`TimerUseCases`がこの配列を順番にEventBusへpublishする。
