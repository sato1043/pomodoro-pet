# ポモドーロタイマー状態遷移設計

## 階層的状態構造

4層の階層的状態マシンで構成される。上位レイヤーが下位レイヤーの文脈を決定する。

```
Layer 1: AppScene          — free | pomodoro | settings
Layer 2: PomodoroState     — work | break | long-break | congrats （+ running）
Layer 3: CharacterBehavior — autonomous | march-cycle | rest-cycle | joyful-rest | celebrate
Layer 4: CharacterState    — idle | wander | march | sit | sleep | happy | ...
```

## 全体フロー

```
AppScene:  free ──────────────→ pomodoro ──────────────────────────────→ free
           │    Start押下        │                    CycleCompleted     │
           │                     │                    で自動遷移         │
           │                     ↓                                      │
           │   ┌─────────────────────────────────────────────────┐      │
           │   │  CyclePlan をインデックス走査                     │      │
           │   │                                                  │      │
           │   │  work ──→ break ──→ work ──→ ... ──→ long-break │      │
           │   │   │         │                           │        │      │
           │   │   │  pause/resume（どのフェーズでも可能）  │        │      │
           │   │   │         │                           │        │      │
           │   │   └─────────┴───────── ... ─────────────┘        │      │
           │   │                                    ↓             │      │
           │   │                                 congrats(5s固定) │      │
           │   │                                 pause/resume不可 │      │
           │   │                                 手動離脱不可     │      │
           │   └──────────────────────────────────────────────────┘      │
           ↓                                                            ↓
```

## フェーズ・プリセット・豚さんの対応表

```
┌──────────────┬───────────────┬──────────────────────────────────┬──────────┬──────────┐
│ フェーズ      │ Preset        │ 豚さんの動き                      │ スクロール│ 操作     │
├──────────────┼───────────────┼──────────────────────────────────┼──────────┼──────────┤
│ (free)       │ autonomous    │ idle → wander → sit → idle → …  │ なし     │ 許可     │
├──────────────┼───────────────┼──────────────────────────────────┼──────────┼──────────┤
│ work         │ march-cycle   │ march → idle → march → idle → … │ marchで  │ 拒否     │
│              │               │  (5-15s)  (5-15s)                │ スクロール│          │
├──────────────┼───────────────┼──────────────────────────────────┼──────────┼──────────┤
│ break        │ rest-cycle    │ happy → sit → idle → sit → …    │ なし     │ 許可     │
│              │               │ (初回のみ) (10-30s) (5-15s)      │          │          │
├──────────────┼───────────────┼──────────────────────────────────┼──────────┼──────────┤
│ long-break   │ joyful-rest   │ happy → sit → idle → happy → …  │ なし     │ 許可     │
│              │               │ (2-5s) (10-30s)(5-15s)(繰り返し) │          │          │
├──────────────┼───────────────┼──────────────────────────────────┼──────────┼──────────┤
│ congrats     │ celebrate     │ happy 固定（lockedState）         │ なし     │ 不可     │
│              │               │ 紙吹雪エフェクト、5秒で自動終了    │          │          │
├──────────────┼───────────────┼──────────────────────────────────┼──────────┼──────────┤
│ (paused)     │ autonomous    │ idle → wander → sit → idle → …  │ なし     │ 許可     │
│              │               │ resume時に元プリセットへ復帰       │          │          │
└──────────────┴───────────────┴──────────────────────────────────┴──────────┴──────────┘
```

### 豚さんの状態遷移テーブル（プリセット別）

```
autonomous:        idle ──→ wander ──→ sit ──→ idle（ループ）

march-cycle:       march ←──→ idle（ループ、march中に背景が流れる）

rest-cycle:        happy ──→ sit ←──→ idle（happyは初回のみ、一方通行）

joyful-rest:       happy ──→ sit ──→ idle ──→ happy（happyが繰り返す）

celebrate:         happy（固定。遷移テーブルなし）
```

### Sets=4での時系列イメージ（デフォルト25/5/15分）

```
時間 →
├── work 25min ──┤── break 5min ──┤── work 25min ──┤── break 5min ──┤
│  march↔idle    │ happy→sit↔idle │  march↔idle    │ happy→sit↔idle │
│  背景→→→       │  背景静止       │  背景→→→       │  背景静止       │
│  Set1          │                │  Set2          │                │
│                │                │                │                │
├── work 25min ──┤── break 5min ──┤── work 25min ──┤── congrats 5s ┤── LB 15min ───┤
│  march↔idle    │ happy→sit↔idle │  march↔idle    │  happy固定     │ happy→sit→idle │
│  背景→→→       │  背景静止       │  背景→→→       │  紙吹雪        │  →happy(繰返し) │
│  Set3          │                │  Set4          │               │  背景静止       │
```

## Layer 1: AppScene

```
                    enterPomodoro()
         free ─────────────────────→ pomodoro
          ↑                              │
          │       exitPomodoro()          │
          │       (手動離脱 or            │
          │        CycleCompleted)       │
          └──────────────────────────────┘
```

- `free → pomodoro`: ユーザーがStartボタンを押す
- `pomodoro → free`: 手動離脱（work/break/long-break中のみ）、またはcongrats自動完了
- `settings`: 型定義のみ（将来実装）

### 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/application/app-scene/AppScene.ts` | AppScene型、AppSceneEvent型 |
| `src/application/app-scene/AppSceneManager.ts` | 純粋な状態ホルダー（EventBus不要） |

## Layer 2: PomodoroState（PomodoroStateMachine）

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

### フェーズ遷移図

```
Sets=4 の場合:

  Set1         Set2         Set3         Set4
┌──────┐    ┌──────┐    ┌──────┐    ┌─────────┐
│ work │    │ work │    │ work │    │  work   │
│  ↓   │    │  ↓   │    │  ↓   │    │   ↓     │
│break │    │break │    │break │    │congrats │
└──┬───┘    └──┬───┘    └──┬───┘    │   ↓     │
   │           │           │        │  l-b    │
   └→──────────┘→──────────┘→───────└────┬────┘
                                         ↓
                                    CycleCompleted
                                    isRunning=false

Sets=1 の場合:

  Set1
┌─────────┐
│  work   │
│   ↓     │
│congrats │
│   ↓     │
│ break   │    ※ Sets=1はLong Breakなし
└────┬────┘
     ↓
CycleCompleted
```

### 遷移規則

```
work完了:
  最終セット以外 → break
  最終セット → congrats

congrats完了:
  Sets>1 → long-break
  Sets=1 → break

break完了（非最終セット）:
  completedSetsInCycle++
  SetCompleted発行
  → work（次セット）

break完了（Sets=1の最終、サイクル末尾）:
  completedSetsInCycle++
  SetCompleted発行
  completedCycles++
  CycleCompleted発行
  isRunning=false（自動停止）
  → work（次サイクル初期状態、PhaseStartedは発行しない）

long-break完了（Sets>1の最終、サイクル末尾）:
  completedSetsInCycle++
  SetCompleted発行
  completedCycles++
  CycleCompleted発行
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

### PomodoroStateMachine インターフェース

```typescript
interface PomodoroStateMachine {
  readonly state: PomodoroState
  readonly currentPhase: TimerPhase
  readonly isRunning: boolean
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

`PomodoroStateMachineOptions`で`PhaseTimeTrigger`を注入可能。tick()内でelapsed/remainingタイミングを判定し、`TriggerFired`イベントを発行する。

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
  | { type: 'TriggerFired'; triggerId: string; phase: PhaseType; timestamp: number }
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

### 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/domain/timer/entities/PomodoroStateMachine.ts` | タイマー中核ロジック（PhaseTimeTrigger対応） |
| `src/domain/timer/value-objects/TimerPhase.ts` | フェーズ型（work/break/long-break/congrats） |
| `src/domain/timer/value-objects/CyclePlan.ts` | フェーズ順列生成 |
| `src/domain/timer/value-objects/PhaseTrigger.ts` | PhaseTimeTrigger型（TriggerTiming, PhaseTriggerSpec） |
| `src/domain/timer/value-objects/TimerConfig.ts` | 設定値 |
| `src/domain/timer/events/TimerEvents.ts` | イベント型定義 |
| `tests/domain/timer/PomodoroStateMachine.test.ts` | テスト（53件） |

## Layer 3: CharacterBehavior（BehaviorPreset）

### フェーズ → プリセット対応（PomodoroOrchestrator）

```
PhaseStarted(work)       → march-cycle
PhaseStarted(break)      → rest-cycle
PhaseStarted(long-break) → joyful-rest
PhaseStarted(congrats)   → celebrate
pause()                  → autonomous
exitPomodoro()           → autonomous
```

PomodoroOrchestratorが直接コールバック（`onBehaviorChange`）でプリセットを切り替える。EventBusは経由しない。

### 関連ソースファイル

| ファイル | 役割 |
|---|---|
| `src/domain/character/value-objects/BehaviorPreset.ts` | 5種のプリセット定義 |
| `src/domain/character/services/BehaviorStateMachine.ts` | applyPreset()でプリセット適用 |
| `src/application/timer/PomodoroOrchestrator.ts` | フェーズ→プリセット切替の一元管理 |
| `src/application/timer/PomodoroEvents.ts` | PomodoroAborted/PomodoroCompletedイベント型 |
| `tests/application/timer/PomodoroOrchestrator.test.ts` | テスト（25件） |

## Layer 4: CharacterState

既存の`CharacterStateName`（idle/wander/march/sit/sleep/happy/reaction/dragged/pet/refuse）。Layer 3のプリセットがこのレイヤーの自律遷移テーブルと許可状態を制御する。

### 各状態の持続時間

| 状態 | 最小 | 最大 | ループ | アニメーション |
|---|---|---|---|---|
| idle | 5s | 15s | yes | idle |
| wander | 3s | 8s | yes | walk |
| march | 5s | 15s | yes | walk |
| sit | 10s | 30s | yes | sit |
| sleep | 15s | 60s | yes | sleep |
| happy | 2s | 5s | no | happy |
| reaction | 2s | 3s | no | wave |
| dragged | 0 | ∞ | yes | idle |
| pet | 3s | 8s | yes | pet |
| refuse | 1.5s | 2.5s | no | refuse |

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
 work(25m,set4), congrats(5s,set4),
 long-break(15m,set4)]
```

Sets=1の場合:
```
[work(25m,set1), congrats(5s,set1),
 break(5m,set1)]
```

## オーケストレーション

PomodoroOrchestratorがAppScene遷移・タイマー操作・キャラクター行動を一元管理する。

```
PomodoroOrchestrator
  ├── startPomodoro()
  │     AppSceneManager.enterPomodoro() → EventBus(AppSceneChanged)
  │     session.start()                → EventBus(PhaseStarted)
  │     onBehaviorChange(march-cycle)   （直接コールバック）
  │
  ├── tick(deltaMs)
  │     session.tick()                 → EventBus(TimerTicked, PhaseStarted, ...)
  │     PhaseStarted検出時             → onBehaviorChange(対応プリセット)
  │     CycleCompleted検出時           → doExitPomodoro()
  │
  ├── pause()
  │     session.pause()                → EventBus(TimerPaused)
  │     onBehaviorChange(autonomous)    （直接コールバック）
  │
  ├── resume()
  │     session.start()                → EventBus(PhaseStarted)
  │     onBehaviorChange(現フェーズ)     （直接コールバック）
  │
  ├── exitPomodoro()  ← 手動中断
  │     doExitPomodoro('abort')
  │       AppSceneManager.exitPomodoro() → EventBus(AppSceneChanged)
  │       session.reset()                → EventBus(TimerReset)
  │       onBehaviorChange(autonomous)    （直接コールバック）
  │       EventBus(PomodoroAborted)       → TimerSfxBridge（exit音再生）
  │
  └── [CycleCompleted検出時]  ← サイクル完了
        doExitPomodoro('complete')
          AppSceneManager.exitPomodoro() → EventBus(AppSceneChanged)
          session.reset()                → EventBus(TimerReset)
          onBehaviorChange(autonomous)    （直接コールバック）
          EventBus(PomodoroCompleted)
```

### ポモドーロライフサイクルイベント

```typescript
type PomodoroEvent =
  | { type: 'PomodoroAborted'; timestamp: number }
  | { type: 'PomodoroCompleted'; timestamp: number }
```

- `PomodoroAborted` — ユーザーがstopアイコンで手動中断した場合に発行。TimerSfxBridgeが`pomodoro-exit.mp3`を再生
- `PomodoroCompleted` — CycleCompleted（全セット完了）による自動終了時に発行

階層間連動は直接コールバック。EventBusはUI/インフラ層への通知のみ。

## デフォルト設定値

| パラメータ | 通常 | デバッグ（VITE_DEBUG_TIMER=1） |
|---|---|---|
| work | 25分 | 1分 |
| break | 5分 | 1分 |
| long-break | 15分 | 1分 |
| setsPerCycle | 1 | 1 |
| congrats | 5秒（固定） | 5秒（固定） |

## 実装上の注意点

### tick()のwhileループ

`tick()`は`elapsedMs >= durationMs`の間whileループする。1フレームで複数フェーズをまたぐケースに対応。overflow（超過分）は次フェーズに繰り越される。

### サイクル完了のPhaseStarted抑制

congrats完了時に`isRunning=false`を設定する。次サイクルを開始するにはユーザーが再度`start()`を呼ぶ必要がある。`isRunning=false`設定後は`PhaseStarted`を発行しない。

### exitManually()のガード

congrats中と停止中は`exitManually()`が無効。congrats中に手動離脱を許可すると祝福演出が途切れるため。
