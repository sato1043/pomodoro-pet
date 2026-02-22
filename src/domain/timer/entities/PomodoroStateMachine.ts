import type { TimerConfig } from '../value-objects/TimerConfig'
import type { TimerPhase } from '../value-objects/TimerPhase'
import type { PhaseType } from '../value-objects/TimerPhase'
import type { TimerEvent } from '../events/TimerEvents'
import type { PhaseTriggerMap, PhaseTriggerSpec } from '../value-objects/PhaseTrigger'
import { buildCyclePlan } from '../value-objects/CyclePlan'
import type { CyclePhase } from '../value-objects/CyclePlan'

export type PomodoroState =
  | { phase: 'work'; running: boolean }
  | { phase: 'break'; running: boolean }
  | { phase: 'long-break'; running: boolean }
  | { phase: 'congrats' }

export interface PomodoroStateMachineOptions {
  readonly phaseTriggers?: PhaseTriggerMap
}

export interface PomodoroStateMachine {
  readonly state: PomodoroState
  readonly currentPhase: TimerPhase
  readonly isRunning: boolean
  readonly elapsedMs: number
  readonly remainingMs: number
  readonly phaseProgress: number
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

interface ActiveTrigger {
  readonly spec: PhaseTriggerSpec
  fired: boolean
}

export function createPomodoroStateMachine(
  config: TimerConfig,
  options?: PomodoroStateMachineOptions
): PomodoroStateMachine {
  const plan = buildCyclePlan(config)
  const phaseTriggers = options?.phaseTriggers ?? {}
  let phaseIndex = 0
  let isRunning = false
  let elapsedMs = 0
  let completedCycles = 0
  let completedSetsInCycle = 0
  let activeTriggers: ActiveTrigger[] = []

  function currentCyclePhase(): CyclePhase {
    return plan[phaseIndex]
  }

  function currentPhaseAsTimerPhase(): TimerPhase {
    const cp = currentCyclePhase()
    return { type: cp.type, durationMs: cp.durationMs }
  }

  function now(): number {
    return Date.now()
  }

  function buildState(): PomodoroState {
    const phase: PhaseType = currentCyclePhase().type
    if (phase === 'congrats') return { phase: 'congrats' }
    return { phase, running: isRunning }
  }

  function loadTriggersForPhase(phaseType: PhaseType): void {
    const specs = phaseTriggers[phaseType]
    activeTriggers = specs
      ? specs.map(spec => ({ spec, fired: false }))
      : []
  }

  function evaluateTriggers(events: TimerEvent[]): void {
    const phase = currentCyclePhase()
    const remaining = phase.durationMs - elapsedMs

    for (const trigger of activeTriggers) {
      if (trigger.fired) continue

      const shouldFire =
        trigger.spec.timing.type === 'elapsed'
          ? elapsedMs >= trigger.spec.timing.afterMs
          : remaining <= trigger.spec.timing.beforeEndMs

      if (shouldFire) {
        trigger.fired = true
        events.push({
          type: 'TriggerFired',
          triggerId: trigger.spec.id,
          phase: phase.type,
          timestamp: now()
        })
      }
    }
  }

  function nextPhase(): { phase: TimerPhase; events: TimerEvent[] } {
    const events: TimerEvent[] = []
    const completed = currentCyclePhase()

    events.push({ type: 'PhaseCompleted', phase: completed.type, timestamp: now() })

    // 休憩完了時 → セット完了
    if (completed.type === 'break' || completed.type === 'long-break') {
      completedSetsInCycle++
      events.push({
        type: 'SetCompleted',
        setNumber: completed.setNumber,
        totalSets: config.setsPerCycle,
        timestamp: now()
      })
    }

    // サイクル最後のフェーズ完了 → サイクル完了
    const isLastPhase = phaseIndex >= plan.length - 1
    if (isLastPhase) {
      completedCycles++
      events.push({
        type: 'CycleCompleted',
        cycleNumber: completedCycles,
        timestamp: now()
      })
      phaseIndex = 0
      completedSetsInCycle = 0
      isRunning = false
    } else {
      phaseIndex++
    }

    const next = currentPhaseAsTimerPhase()

    // サイクル完了（自動停止）時はPhaseStartedを発行しない
    // 次回start()でPhaseStartedが発行される
    if (isRunning) {
      events.push({ type: 'PhaseStarted', phase: next.type, timestamp: now() })
      loadTriggersForPhase(next.type)
    }
    return { phase: next, events }
  }

  const session: PomodoroStateMachine = {
    get state() { return buildState() },
    get currentPhase() { return currentPhaseAsTimerPhase() },
    get isRunning() { return isRunning },
    get elapsedMs() { return elapsedMs },
    get remainingMs() { return currentCyclePhase().durationMs - elapsedMs },
    get phaseProgress() {
      const duration = currentCyclePhase().durationMs
      if (duration <= 0) return 1.0
      return Math.min(elapsedMs / duration, 1.0)
    },
    get completedCycles() { return completedCycles },
    get currentSet() { return currentCyclePhase().setNumber },
    get totalSets() { return config.setsPerCycle },
    get completedSets() { return completedSetsInCycle },

    start(): TimerEvent[] {
      if (isRunning) return []
      isRunning = true
      loadTriggersForPhase(currentCyclePhase().type)
      return [{ type: 'PhaseStarted', phase: currentCyclePhase().type, timestamp: now() }]
    },

    tick(deltaMs: number): TimerEvent[] {
      if (!isRunning) return []

      const events: TimerEvent[] = []
      elapsedMs += deltaMs

      while (elapsedMs >= currentCyclePhase().durationMs) {
        const overflow = elapsedMs - currentCyclePhase().durationMs
        const transition = nextPhase()
        events.push(...transition.events)
        elapsedMs = overflow
      }

      // トリガー判定（フェーズ遷移後の新フェーズに対して）
      if (isRunning) {
        evaluateTriggers(events)
      }

      events.push({ type: 'TimerTicked', remainingMs: currentCyclePhase().durationMs - elapsedMs })
      return events
    },

    pause(): TimerEvent[] {
      if (!isRunning) return []
      if (currentCyclePhase().type === 'congrats') return []
      isRunning = false
      return [{ type: 'TimerPaused', elapsedMs }]
    },

    reset(): TimerEvent[] {
      isRunning = false
      elapsedMs = 0
      phaseIndex = 0
      completedCycles = 0
      completedSetsInCycle = 0
      activeTriggers = []
      return [{ type: 'TimerReset' }]
    },

    exitManually(): TimerEvent[] {
      if (currentCyclePhase().type === 'congrats') return []
      if (!isRunning) return []
      return session.reset()
    }
  }

  return session
}
