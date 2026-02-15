# 階層的状態マシン設計文書

## 背景と課題

### 現行アーキテクチャ

3つの独立した状態管理システムがEventBus + フラグで接続されている。

```
AppModeManager(free/pomodoro/congrats)
    ↓ EventBus
TimerCharacterBridge（条件分岐で接続）
    ↓ flags (scrollingAllowed, lockState)
BehaviorStateMachine(idle/wander/march/sit/...)
```

加えて`PomodoroSession`がタイマーフェーズ（work/break/long-break）と動作状態（running/paused）を暗黙的に管理している。

### 問題

1. **状態の組み合わせが暗黙的**: AppMode × TimerPhase × isRunning × CharacterState の有効な組み合わせが明文化されていない
2. **接続ロジックの散在**: `TimerCharacterBridge`が5つのイベント購読と複数の条件分岐でモジュールを接続。`main.ts`の`subscribeAppModeToSession`も3分岐の条件ロジックを持つ
3. **フラグによる間接制御**: `scrollingAllowed`、`lockState`、`resolveTimeoutTarget`の昇格ロジックなど、本来は状態遷移で表現すべき振る舞いがフラグと条件分岐で実現されている
4. **拡張時の複雑度増加**: 新しいモードや振る舞いを追加するたびにBridgeの分岐とフラグの組み合わせが増える

## 設計目標

階層的状態マシン（Statechart）を導入し、親状態が子状態の文脈を決定する入れ子構造にする。

- 各階層が自分の責務だけを持つ
- `scrollingAllowed`、`lockState`のようなフラグを不要にする
- 状態の追加が宣言的にできるようにする

## 状態階層

```
App (root)
├── free
│     └── character: AutonomousCycle
│           idle → wander → sit → idle → ...
│
├── pomodoro
│     ├── work
│     │     └── character: MarchCycle
│     │           march(5-15s) → idle(5-15s) → march → ...
│     │           インタラクション拒否
│     │           背景スクロール（march中のみ）
│     │           ★ PhaseTimeTrigger対応（例: 終了30秒前に演出）
│     │
│     ├── break
│     │     └── character: RestCycle
│     │           初回: happy(一度だけ、work完了の控えめな祝い)
│     │           以降: sit(10-30s) ↔ idle(5-15s)
│     │           背景静止
│     │
│     ├── long-break
│     │     └── character: JoyfulRest
│     │           happy(2-5s) → sit(10-30s) → idle(5-15s) → happy → ...
│     │           背景静止
│     │
│     ├── congrats
│     │     └── character: Celebrate
│     │           happy固定（lockedState）
│     │           紙吹雪エフェクト
│     │           5秒で自動終了（dismiss操作なし）
│     │           pause/resume不可、手動離脱不可
│     │
│     └── (paused)
│           └── character: AutonomousCycle（freeと同じ）
│               pause中はキャラクターが自由行動に戻る
│
└── settings（将来）
      └── 未定
```

## 現行との構造対比

### Layer 1: AppScene（最上位状態）

```typescript
type AppScene = 'free' | 'pomodoro' | 'settings'
```

現行の`AppMode`から`congrats`を除外し、`settings`を追加。`congrats`はpomodoroの子状態に移動する。

#### 遷移

```
        enterPomodoro()                  openSettings()
free ←─────────────────→ pomodoro    free ←──────────────→ settings
         exitPomodoro()                 closeSettings()
```

- `free → pomodoro`: ユーザーがStartボタンを押す
- `pomodoro → free`: ユーザーが手動離脱（work/break/long-break中のみ）、またはcongrats自動完了
- `free → settings`: 将来実装
- `settings → free`: 将来実装

### Layer 2: PomodoroPhase（pomodoro内部状態）

```typescript
type PomodoroPhase = 'work' | 'break' | 'long-break' | 'congrats'
```

現行の`PomodoroSession`のフェーズ遷移 + `congrats`を統合。

#### 遷移

```
work → break → work → break → ... → work → long-break → congrats → (pomodoroを終了)
                                                              │
           pause/resume（work/break/long-break中のみ）         │ 5秒自動
           手動離脱（work/break/long-break中のみ）              ↓
                                                       free に遷移
```

- `work → break`: workフェーズ時間到達
- `break → work`: breakフェーズ時間到達
- `work → long-break`: 最終セットのworkフェーズ時間到達
- `long-break → congrats`: long-breakフェーズ時間到達（= CycleCompleted）
- `congrats → (free)`: 5秒で自動的に親状態（pomodoro）を終了し、freeに遷移

#### congrats の制約

- pause/resume不可（タイマーの概念がない。5秒の固定演出）
- クリックdismiss不可（自動完了のみ）
- 手動離脱不可（5秒間はcongratsに留まる）

#### pause の振る舞い

- work/break/long-break中のみ有効
- pause中はキャラクターがautonomousプリセットに切り替わる（freeと同じ自由行動）
- resume時は元のフェーズのプリセットに復帰する

### Layer 3: CharacterBehavior（キャラクターの振る舞いプリセット）

```typescript
type CharacterBehavior = 'autonomous' | 'march-cycle' | 'rest-cycle' | 'joyful-rest' | 'celebrate'
```

各PomodoroPhase（またはAppScene）が、キャラクターの振る舞いプリセットを決定する。

| 親状態 | CharacterBehavior | 自律遷移サイクル | スクロール | インタラクション |
|---|---|---|---|---|
| free | `autonomous` | idle → wander → sit → idle | なし | 許可 |
| pomodoro.work | `march-cycle` | march → idle → march | march中あり | 拒否 |
| pomodoro.break | `rest-cycle` | happy(初回のみ) → sit ↔ idle | なし | 許可 |
| pomodoro.long-break | `joyful-rest` | happy → sit → idle → happy | なし | 許可 |
| pomodoro.congrats | `celebrate` | happy固定 | なし | 不可（操作なし） |
| pomodoro.(paused) | `autonomous` | idle → wander → sit → idle | なし | 許可 |

#### work完了の喜び表現

workフェーズが完了してbreakに遷移するとき、rest-cycleプリセットのinitialStateを`happy`にすることで実現する。happy → sit への遷移が一方通行のため、happyは一度だけ表示される。これによりwork完了の控えめな祝いを表現する。

### Layer 4: CharacterState（個々のアニメーション状態）

既存の`CharacterStateName`（idle/wander/march/sit/sleep/happy/...）。これは変更しない。Layer 3のプリセットが、このレイヤーの自律遷移テーブルと許可状態を制御する。

## 設計方針

### BehaviorPreset: 振る舞いプリセットの宣言的定義

現在`scrollingAllowed`、`lockState`、`resolveTimeoutTarget`の昇格ロジックで実現している制御を、宣言的なプリセット定義に置き換える。

```typescript
interface BehaviorPreset {
  /** プリセット名 */
  readonly name: CharacterBehavior
  /** このプリセットで使用する自律遷移テーブル */
  readonly transitions: Partial<Record<CharacterStateName, CharacterStateName>>
  /** 初期状態 */
  readonly initialState: CharacterStateName
  /** 背景スクロールを許可する状態の集合 */
  readonly scrollingStates: ReadonlySet<CharacterStateName>
  /** インタラクションを拒否するか */
  readonly interactionLocked: boolean
  /** 状態ロック（nullなら無効） */
  readonly lockedState: CharacterStateName | null
}
```

#### プリセット定義

```typescript
const BEHAVIOR_PRESETS: Record<CharacterBehavior, BehaviorPreset> = {
  autonomous: {
    name: 'autonomous',
    transitions: { idle: 'wander', wander: 'sit', sit: 'idle' },
    initialState: 'idle',
    scrollingStates: new Set(),
    interactionLocked: false,
    lockedState: null,
  },
  'march-cycle': {
    name: 'march-cycle',
    transitions: { march: 'idle', idle: 'march' },
    initialState: 'march',
    scrollingStates: new Set(['march']),
    interactionLocked: true,
    lockedState: null,
  },
  'rest-cycle': {
    name: 'rest-cycle',
    transitions: { happy: 'sit', sit: 'idle', idle: 'sit' },
    initialState: 'happy',   // work完了の控えめな祝い（一度だけhappy）
    scrollingStates: new Set(),
    interactionLocked: false,
    lockedState: null,
  },
  'joyful-rest': {
    name: 'joyful-rest',
    transitions: { happy: 'sit', sit: 'idle', idle: 'happy' },
    initialState: 'happy',
    scrollingStates: new Set(),
    interactionLocked: false,
    lockedState: null,
  },
  celebrate: {
    name: 'celebrate',
    transitions: {},
    initialState: 'happy',
    scrollingStates: new Set(),
    interactionLocked: false,  // インタラクション自体が到達しない（UI操作なし）
    lockedState: 'happy',
  },
}
```

#### BehaviorStateMachineへの適用

```typescript
interface BehaviorStateMachine {
  // 既存メソッド...
  applyPreset(preset: BehaviorPreset): void  // プリセットを適用し、初期状態に遷移
}
```

`applyPreset()`を呼ぶと:
1. 自律遷移テーブルを差し替える
2. scrollingStatesから`shouldScroll`を判定
3. interactionLockedを設定
4. lockedStateを設定
5. initialStateに遷移する

これにより`scrollingAllowed`フラグ、`lockState`/`unlockState`、`resolveTimeoutTarget`の昇格ロジックが不要になる。状態マシンは「今どのプリセットが適用されているか」だけを知っていればよい。

### PhaseTimeTrigger: フェーズ内の時間トリガー

フェーズの特定タイミングで任意の追加処理を発火させる仕組み。ドメイン層が「いつ」を判定し、アプリケーション層が「何を」を実行する。

#### 2種類のタイミング

```typescript
type TriggerTiming =
  | { type: 'elapsed'; afterMs: number }       // フェーズ開始からの経過時間で発火
  | { type: 'remaining'; beforeEndMs: number }  // フェーズ終了までの残り時間で発火
```

- **elapsed**: フェーズ開始から指定ミリ秒経過したら発火。例: 「work開始5分後にBGMを変更」
- **remaining**: フェーズ終了まで指定ミリ秒を切ったら発火。例: 「work終了30秒前に応援BGM」

#### ドメイン層: PhaseTrigger定義

```typescript
interface PhaseTrigger {
  readonly id: string
  readonly timing: TriggerTiming
  fired: boolean  // 一度発火したらtrue（同一フェーズ内で重複発火しない）
}

interface PhaseTriggerSpec {
  readonly id: string
  readonly timing: TriggerTiming
}
```

`PomodoroStateMachine`のtick()内でトリガー条件を判定する:

```typescript
// tick()内の判定ロジック
for (const trigger of activeTriggers) {
  if (trigger.fired) continue

  const shouldFire =
    trigger.timing.type === 'elapsed'
      ? elapsedMs >= trigger.timing.afterMs
      : remainingMs <= trigger.timing.beforeEndMs

  if (shouldFire) {
    trigger.fired = true
    events.push({ type: 'TriggerFired', triggerId: trigger.id, phase: currentPhase.type })
  }
}
```

フェーズ切替時にactiveTriggers.fired をリセットする。

#### アプリケーション層: トリガーの利用

```typescript
// TimerCharacterBridgeまたは専用のTriggerHandlerで
bus.subscribe('TriggerFired', (event) => {
  switch (event.triggerId) {
    case 'work-ending-soon':
      // BGMを力強くする、キャラクターの表情を変える等
      break
    case 'work-celebration':
      // lockState('happy')を短時間適用する等
      break
  }
})
```

#### トリガーの登録方法

トリガーはフェーズ定義に紐づける。CyclePlanの各CyclePhaseにトリガー配列を持たせる案と、PomodoroStateMachineの生成時に外部から注入する案がある。

```typescript
// 案A: CyclePhaseに埋め込み
interface CyclePhase {
  readonly type: PhaseType
  readonly durationMs: number
  readonly setNumber: number
  readonly triggers?: readonly PhaseTriggerSpec[]
}

// 案B: StateMachine生成時に注入
interface PomodoroStateMachineConfig {
  readonly timerConfig: TimerConfig
  readonly phaseTriggers: Partial<Record<PhaseType, readonly PhaseTriggerSpec[]>>
}
```

案Bが望ましい。理由: CyclePlanはドメインの純粋な値オブジェクトであり、コールバック的な概念を持ち込むべきでない。トリガーのスペック（何秒前か）はドメイン知識だが、何をするかはアプリケーション層の責務である。

#### ユースケース例

```typescript
const phaseTriggers = {
  work: [
    { id: 'work-ending-soon', timing: { type: 'remaining', beforeEndMs: 30_000 } },
    // work終了30秒前: BGMを力強くしてユーザーを応援
  ],
  break: [
    { id: 'break-halfway', timing: { type: 'elapsed', afterMs: 150_000 } },
    // break開始2.5分後: 何らかの演出（例）
  ],
}
```

#### remainingの解決タイミング

`remaining`型のトリガーは、フェーズのdurationMsを知らないと判定できない。解決方法:
- `tick()`の時点で`remainingMs = durationMs - elapsedMs`を計算できる
- PomodoroStateMachineはフェーズのdurationMsを知っているため、問題なく解決できる

#### イベント型の拡張

```typescript
type TimerEvent =
  | { type: 'PhaseStarted'; phase: PhaseType; timestamp: number }
  | { type: 'PhaseCompleted'; phase: PhaseType; timestamp: number }
  | { type: 'SetCompleted'; setNumber: number; totalSets: number; timestamp: number }
  | { type: 'CycleCompleted'; cycleNumber: number; timestamp: number }
  | { type: 'TimerTicked'; remainingMs: number }
  | { type: 'TimerPaused'; elapsedMs: number }
  | { type: 'TimerReset' }
  | { type: 'TriggerFired'; triggerId: string; phase: PhaseType; timestamp: number }  // 新規
```

### PomodoroStateMachine: タイマーフェーズの明示化

現行の`PomodoroSession`は`isRunning` + `phaseIndex` + `elapsedMs`で状態を暗黙管理している。これを明示的な状態マシンに置き換える。

```typescript
type PomodoroState =
  | { phase: 'work'; running: boolean }
  | { phase: 'break'; running: boolean }
  | { phase: 'long-break'; running: boolean }
  | { phase: 'congrats' }  // running状態なし（5秒の固定演出）

interface PomodoroStateMachine {
  readonly state: PomodoroState
  readonly elapsedMs: number
  readonly remainingMs: number
  readonly currentSet: number
  readonly totalSets: number
  start(): void           // running=true
  pause(): void           // running=false、autonomousプリセットに切替
  tick(deltaMs: number): void  // 時間進行、フェーズ遷移+トリガー判定は内部で自動
  reset(): void           // work + running=false に戻す
  exitManually(): void    // 手動離脱（congrats中は無効）
}
```

#### congratsの扱い

congratsはCyclePlanに5秒固定のフェーズとして追加する。tick()で時間が到達したらpomodoroを自動終了する。

```typescript
// CyclePlanの末尾にcongrats追加
// 例: Sets=4の場合
// [work, break, work, break, work, break, work, long-break, congrats]
```

PhaseType型にcongratsを追加する:
```typescript
type PhaseType = 'work' | 'break' | 'long-break' | 'congrats'
```

congratsフェーズは:
- durationMs: 5000（固定）
- pause()が無効
- exitManually()が無効
- tick()で5秒到達時にpomodoro終了シグナルを発行

#### pauseの扱い

pauseはPomodoroPhaseの独立した状態ではなく、work/break/long-breakの`running`フラグで表現する。ただしキャラクターの振る舞いはautonomousプリセットに切り替わる。

```
pause時:
  PomodoroState = { phase: 'work', running: false }
  CharacterBehavior = 'autonomous'（一時的な切替）

resume時:
  PomodoroState = { phase: 'work', running: true }
  CharacterBehavior = 'march-cycle'（元のプリセットに復帰）
```

#### フェーズ遷移時のイベント発行

フェーズ遷移時のイベント発行は内部で行う。外部のBridgeではなく、状態マシン自体がBehaviorPresetの切り替えをトリガーする。

### CyclePlanへのcongrats統合

```typescript
export function buildCyclePlan(config: TimerConfig): CyclePhase[] {
  const phases: CyclePhase[] = []

  for (let set = 1; set <= config.setsPerCycle; set++) {
    phases.push({ type: 'work', durationMs: config.workDurationMs, setNumber: set })

    const isLastSet = set === config.setsPerCycle
    if (isLastSet && config.setsPerCycle > 1) {
      phases.push({ type: 'long-break', durationMs: config.longBreakDurationMs, setNumber: set })
    } else {
      phases.push({ type: 'break', durationMs: config.breakDurationMs, setNumber: set })
    }
  }

  // サイクル末尾にcongrats追加
  phases.push({ type: 'congrats', durationMs: 5000, setNumber: config.setsPerCycle })

  return phases
}
```

### AppSceneManager: 最上位の状態管理

```typescript
type AppScene = 'free' | 'pomodoro' | 'settings'

interface AppSceneManager {
  readonly currentScene: AppScene
  enterPomodoro(): void   // free → pomodoro
  exitPomodoro(): void    // pomodoro → free
  openSettings(): void    // free → settings（将来）
  closeSettings(): void   // settings → free（将来）
}
```

`congrats`の管理はpomodoroの内部責務になるため、AppSceneManagerは`congrats`を知らない。pomodoroが内部的にcongratsを完了したとき、AppSceneManagerに「pomodoroを終了する」と通知する。

## 階層間の連動

### 現行: イベント駆動 + フラグ

```
PomodoroSession → EventBus → TimerCharacterBridge → BehaviorStateMachine.setScrollingAllowed()
                                                   → BehaviorStateMachine.lockState()
                → EventBus → AppModeManager → EventBus → subscribeAppModeToSession
                                                       → TimerOverlay.switchToMode()
                                                       → TimerSfxBridge
```

5つのBridge/購読が6種のイベントを仲介し、2つのフラグを操作している。

### 新設計: 階層的コールバック + 通知用EventBus

```
AppSceneManager
  ├── onSceneChanged → EventBus → UI切替（TimerOverlay）
  └── pomodoro進入時 → PomodoroStateMachineを起動
        ├── onPhaseChanged → BehaviorPreset切替 → BehaviorStateMachine.applyPreset()
        ├── onPhaseChanged → EventBus → UI更新（TimerOverlay）
        ├── onPhaseChanged → EventBus → SFX再生（TimerSfxBridge）
        ├── onTriggerFired → EventBus → 演出処理
        ├── onPaused → BehaviorPreset切替（autonomous）
        ├── onResumed → BehaviorPreset復帰
        └── onCongratsCompleted → AppSceneManager.exitPomodoro()
```

状態管理の中核は直接的なコールバック（または関数呼び出し）で連動する。EventBusはUI層（TimerOverlay）やインフラ層（SfxPlayer）への疎結合通知に限定する。

## 移行戦略

### Phase 1: BehaviorPresetの導入 — 完了

`scrollingAllowed`、`lockState`、`resolveTimeoutTarget`の昇格ロジックをBehaviorPresetに置き換えた。

実施内容:
- `BehaviorStateMachine`: `applyPreset()`メソッド追加、フラグ系メソッドを内部化
- `BehaviorPreset`: 5種のプリセット定義（autonomous/march-cycle/rest-cycle/joyful-rest/celebrate）
- `TimerCharacterBridge`: イベント→プリセット切替に簡略化
- テスト: プリセット単位のテストに整理

### Phase 2: congratsのpomodoro内部統合 + CyclePlan拡張 — 完了

`congrats`をAppModeの独立シーンからPomodoroSession内部フェーズに統合した。

実施内容:
- `CyclePlan`: congratsフェーズ（5秒）を末尾に追加
- `PhaseType`に`congrats`追加
- `AppModeManager`から`congrats`を除去（completeCycle/dismissCongrats廃止）
- `TimerSfxBridge`: PhaseStarted(congrats)でファンファーレ再生に変更
- `TimerOverlay`: PhaseStarted(congrats)でcongratsモード表示

**未実施（Phase 2計画にあったが延期）:**
- PhaseTimeTrigger（`TriggerFired`イベント追加）
- `subscribeAppModeToSession`の廃止（PomodoroStateMachine内部完結化）

### Phase 3: AppSceneManager + PomodoroStateMachineリネーム — 完了

命名を設計文書に合わせ、PomodoroSessionの状態を明示的な型で表現した。

実施内容:
- `AppMode` → `AppScene`、`AppModeManager` → `AppSceneManager` リネーム
- `AppScene`型に`'settings'`を追加（型定義のみ）
- `PomodoroSession` → `PomodoroStateMachine` リネーム
- `PomodoroState`判別共用体型の導入（phase + running）
- `state`ゲッター、`exitManually()`メソッド追加

### Phase 4: PhaseTimeTrigger + PomodoroOrchestrator + EventBus役割限定 — 完了

実施内容:
- `PhaseTrigger`: elapsed/remaining型のPhaseTimeTrigger型定義
- `TimerEvents`: `TriggerFired`イベント追加
- `PomodoroStateMachine`: `PomodoroStateMachineOptions`でトリガー注入、`tick()`内で判定・発火
- `PomodoroOrchestrator`: AppScene遷移+タイマー操作+キャラクター行動を一元管理する新モジュール
- `AppSceneManager`: CycleCompleted購読とdisposeを除去。EventBus不要の純粋な状態ホルダーに簡素化
- `TimerCharacterBridge`: 廃止。ロジックはPomodoroOrchestratorの直接コールバックに移行
- `TimerUseCases`: 廃止。PomodoroOrchestratorが同等機能を提供
- `main.ts`: subscribeAppSceneToSession削除。PomodoroOrchestrator生成に置換
- EventBus: UI/インフラ通知（TimerOverlay, SettingsPanel, TimerSfxBridge）のみに限定

## 現行コードとの対応表

| 旧 | 現行 | 移行Phase |
|---|---|---|
| `AppMode` (free/pomodoro/congrats) | `AppScene` (free/pomodoro/settings) | Phase 2-3 |
| `AppModeManager` | `AppSceneManager`（純粋状態ホルダー） | Phase 3-4 |
| `PomodoroSession` (isRunning + phaseIndex) | `PomodoroStateMachine` (明示的状態) | Phase 2-3 |
| `scrollingAllowed` フラグ | `BehaviorPreset.scrollingStates` | Phase 1 |
| `lockState` / `unlockState` | `BehaviorPreset.lockedState` | Phase 1 |
| `resolveTimeoutTarget` 昇格ロジック | `BehaviorPreset.transitions` | Phase 1 |
| `TimerCharacterBridge` (EventBus購読) | `PomodoroOrchestrator`（直接コールバック） | Phase 1→4 |
| `TimerUseCases` (start/pause/reset/tick) | `PomodoroOrchestrator` | Phase 4 |
| `subscribeAppSceneToSession` (EventBus経由) | `PomodoroOrchestrator.startPomodoro/exitPomodoro`（直接呼出し） | Phase 4 |
| `TIMEOUT_TRANSITIONS` (固定テーブル) | `BehaviorPreset.transitions`(プリセット別) | Phase 1 |
| なし | `PhaseTimeTrigger`（elapsed/remaining） | Phase 4 |

## 決定事項

前回の検討で以下が決定済み。

### congrats

- 5秒で自動終了する固定演出フェーズ
- クリックdismiss不可
- pause/resume不可
- 手動離脱不可
- CyclePlanの末尾にcongratsフェーズ（5000ms）を追加して実現
- tick()で5秒到達を検出し、pomodoro終了シグナルを発行

### break中のキャラクター

- rest-cycleプリセット: happy(初回のみ) → sit ↔ idle
- initialStateが`happy`のため、break進入時に一度だけhappyを表示（work完了の控えめな祝い）
- happy → sit は一方通行（idleからhappyに戻らない）

### long-break中のキャラクター

- joyful-restプリセット: happy → sit → idle → happy → ...
- happyが繰り返し登場する（idle → happy の遷移がある）
- 喜びながら休んでいる雰囲気を表現

### pause中のキャラクター

- autonomousプリセットに切り替え（freeと同じ自由行動）
- PomodoroPhaseの独立状態ではなく、running=falseで表現
- resume時に元のフェーズのプリセットに復帰

### 手動離脱

- work/break/long-break中は可能
- congrats中は不可

### EventBusの役割

- 状態管理の中核からは除外
- UI層（TimerOverlay）、インフラ層（SfxPlayer）への疎結合通知に限定
- 階層間の連動はコールバック/関数呼び出しで直接接続

### CyclePlan

- 引き続き使用する
- congratsフェーズを末尾に追加

### PhaseTimeTrigger

- elapsed（フェーズ開始からの経過時間）とremaining（フェーズ終了までの残り時間）の2種類のタイミング
- ドメイン層が「いつ」を判定、アプリケーション層が「何を」を実行
- トリガースペックはPomodoroStateMachine生成時に注入（CyclePlanには埋め込まない）

## 未決事項

1. **settings状態の具体的な設計**: 現在はモーダル。独立シーンにする場合の遷移ルールとUI設計。→ 将来検討
2. **congratsのdurationMsの設定可能性**: 現在5秒固定。TimerConfigに含めるか、ハードコードで十分か
3. **PhaseTimeTriggerの登録API**: PomodoroStateMachineのコンストラクタに渡すか、後から追加可能にするか
4. **pause中のタイマーUI表示**: pause中にTimerOverlayをどう表示するか（現行維持 or 変更）
