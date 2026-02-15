# ポモドーロタイマー状態遷移設計

## 階層的状態構造

本システムは4層の階層的状態マシンで構成される。

```
Layer 1: AppScene          — free | pomodoro | settings
Layer 2: PomodoroState     — work | break | long-break | congrats （+ running）
Layer 3: CharacterBehavior — autonomous | march-cycle | rest-cycle | joyful-rest | celebrate
Layer 4: CharacterState    — idle | wander | march | sit | sleep | happy | ...
```

各レイヤーは上位レイヤーの文脈で決定される。

## Layer 1: AppScene

詳細: [app-mode-design.md](app-mode-design.md)

```
                    enterPomodoro()
         free ─────────────────────→ pomodoro
          ↑                              │
          │       exitPomodoro()          │
          │       (手動離脱 or            │
          │        CycleCompleted)       │
          └──────────────────────────────┘
```

## Layer 2: PomodoroState（PomodoroStateMachine）

### 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/domain/timer/entities/PomodoroStateMachine.ts` | タイマー中核ロジック |
| `src/domain/timer/value-objects/TimerPhase.ts` | フェーズ型（work/break/long-break/congrats） |
| `src/domain/timer/value-objects/CyclePlan.ts` | フェーズ順列生成 |
| `src/domain/timer/value-objects/TimerConfig.ts` | 設定値 |
| `src/domain/timer/events/TimerEvents.ts` | イベント型定義 |
| `src/application/timer/TimerUseCases.ts` | start/pause/reset/tick → EventBus発行 |
| `tests/domain/timer/PomodoroStateMachine.test.ts` | テスト（47件） |

### PomodoroState 型

```typescript
type PomodoroState =
  | { phase: 'work'; running: boolean }
  | { phase: 'break'; running: boolean }
  | { phase: 'long-break'; running: boolean }
  | { phase: 'congrats' }
```

- work/break/long-break は `running` プロパティを持つ（true=動作中, false=一時停止中）
- congrats は `running` を持たない（5秒固定の演出フェーズ、pause不可）

### PomodoroStateMachine インターフェース

```typescript
interface PomodoroStateMachine {
  readonly state: PomodoroState
  readonly currentPhase: TimerPhase     // 互換性維持
  readonly isRunning: boolean           // 互換性維持
  readonly elapsedMs: number
  readonly remainingMs: number
  readonly completedCycles: number
  readonly currentSet: number
  readonly totalSets: number
  readonly completedSets: number
  start(): TimerEvent[]
  tick(deltaMs: number): TimerEvent[]
  pause(): TimerEvent[]
  reset(): TimerEvent[]
  exitManually(): TimerEvent[]
}
```

### フェーズ遷移図

```
Sets=4 の場合:

  Set1         Set2         Set3         Set4
┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
│ work │    │ work │    │ work │    │ work │
│  ↓   │    │  ↓   │    │  ↓   │    │  ↓   │
│break │    │break │    │break │    │ l-b  │
└──┬───┘    └──┬───┘    └──┬───┘    └──┬───┘
   │           │           │           │
   └→──────────┘→──────────┘→──────────┘
                                       ↓
                                  ┌──────────┐
                                  │ congrats │
                                  │ (5000ms) │
                                  └────┬─────┘
                                       ↓
                                  CycleCompleted
                                  isRunning=false

Sets=1 の場合:

  Set1
┌──────┐
│ work │
│  ↓   │
│break │    ※ Sets=1はLong Breakなし
└──┬───┘
   ↓
┌──────────┐
│ congrats │
│ (5000ms) │
└────┬─────┘
     ↓
CycleCompleted
```

### 遷移規則

```
work完了:
  最終セット以外 → break
  最終セット（Sets>1） → long-break
  最終セット（Sets=1） → break（Long Breakなし）

break完了:
  completedSetsInCycle++
  SetCompleted発行
  最終セット → congrats
  それ以外 → work（次セット）

long-break完了:
  completedSetsInCycle++
  SetCompleted発行
  → congrats

congrats完了:
  completedCycles++
  CycleCompleted発行
  phaseIndex=0, completedSetsInCycle=0
  isRunning=false（自動停止）
  → work（次サイクル初期状態、PhaseStartedは発行しない）
```

### 操作の制約

| 操作 | work | break | long-break | congrats | 停止中 |
|---|---|---|---|---|---|
| `start()` | - | - | - | - | PhaseStarted発行 |
| `pause()` | TimerPaused発行 | TimerPaused発行 | TimerPaused発行 | 無効（空配列） | 無効 |
| `reset()` | TimerReset発行 | TimerReset発行 | TimerReset発行 | TimerReset発行 | TimerReset発行 |
| `exitManually()` | reset()委譲 | reset()委譲 | reset()委譲 | 無効（空配列） | 無効（空配列） |

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

### フェーズ完了時のイベント発行順序

通常のフェーズ完了時:
1. `PhaseCompleted`（完了したフェーズ）
2. 条件により `SetCompleted`（break/long-break完了時）
3. `PhaseStarted`（次フェーズ）

サイクル完了時（congrats完了）:
1. `PhaseCompleted(congrats)`
2. `CycleCompleted`
3. **`PhaseStarted`は発行しない**（`isRunning=false`のため）

## Layer 3: CharacterBehavior（BehaviorPreset）

### 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/domain/character/value-objects/BehaviorPreset.ts` | プリセット定義 |
| `src/domain/character/services/BehaviorStateMachine.ts` | プリセット適用ロジック |
| `src/application/character/TimerCharacterBridge.ts` | フェーズ→プリセット切替 |

### プリセット一覧

| プリセット名 | 自律遷移サイクル | スクロール | インタラクション | 適用場面 |
|---|---|---|---|---|
| `autonomous` | idle→wander→sit→idle | なし | 許可 | free, pause |
| `march-cycle` | march→idle→march | march中あり | 拒否 | work |
| `rest-cycle` | happy(初回のみ)→sit↔idle | なし | 許可 | break |
| `joyful-rest` | happy→sit→idle→happy | なし | 許可 | long-break |
| `celebrate` | happy固定 | なし | - | congrats |

### フェーズ → プリセット対応

```
PhaseStarted(work)       → march-cycle
PhaseStarted(break)      → rest-cycle
PhaseStarted(long-break) → joyful-rest
PhaseStarted(congrats)   → celebrate
TimerPaused              → autonomous
TimerReset               → autonomous
AppSceneChanged(free)    → autonomous
```

## Layer 4: CharacterState

既存の`CharacterStateName`（idle/wander/march/sit/sleep/happy/reaction/dragged/pet/refuse）。Layer 3のプリセットがこのレイヤーの自律遷移テーブルと許可状態を制御する。変更なし。

## CyclePlan

`buildCyclePlan(config)`がTimerConfigからCyclePhase[]を生成する。

```typescript
interface CyclePhase {
  readonly type: PhaseType    // 'work' | 'break' | 'long-break' | 'congrats'
  readonly durationMs: number
  readonly setNumber: number
}
```

Sets=4の場合の生成結果:
```
[work(25m,set1), break(5m,set1),
 work(25m,set2), break(5m,set2),
 work(25m,set3), break(5m,set3),
 work(25m,set4), long-break(15m,set4),
 congrats(5s,set4)]
```

Sets=1の場合:
```
[work(25m,set1), break(5m,set1),
 congrats(5s,set1)]
```

## デフォルト設定値

| パラメータ | 通常 | デバッグ（VITE_DEBUG_TIMER=1） |
|---|---|---|
| work | 25分 | 1分 |
| break | 5分 | 1分 |
| long-break | 15分 | 1分 |
| setsPerCycle | 1 | 1 |

## 実装上の注意点

### tick()のwhileループ

`tick()`は`elapsedMs >= durationMs`の間whileループする。1フレームで複数フェーズをまたぐケースに対応。overflow（超過分）は次フェーズに繰り越される。

### サイクル完了のPhaseStarted抑制

congrats完了時に`isRunning=false`を設定する。次サイクルを開始するにはユーザーが再度`start()`を呼ぶ必要がある。`isRunning=false`設定後は`PhaseStarted`を発行しない。

### exitManually()のガード

congrats中と停止中は`exitManually()`が無効。congrats中に手動離脱を許可すると祝福演出が途切れるため。

### AppSceneManagerとの連携

`main.ts`の`subscribeAppSceneToSession()`が`AppSceneChanged`を購読し、pomodoro遷移時にsession.reset()+start()、free遷移時にsession.reset()を呼ぶ。この組み立て層のロジックは将来PomodoroStateMachine内部に統合予定。
