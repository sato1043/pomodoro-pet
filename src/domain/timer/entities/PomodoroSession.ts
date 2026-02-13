import type { TimerConfig } from '../value-objects/TimerConfig'
import type { TimerPhase } from '../value-objects/TimerPhase'
import type { TimerEvent } from '../events/TimerEvents'
import { buildCyclePlan } from '../value-objects/CyclePlan'
import type { CyclePhase } from '../value-objects/CyclePlan'

export interface PomodoroSession {
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
}

export function createPomodoroSession(config: TimerConfig): PomodoroSession {
  const plan = buildCyclePlan(config)
  let phaseIndex = 0
  let isRunning = false
  let elapsedMs = 0
  let completedCycles = 0
  let completedSetsInCycle = 0

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
    }
    return { phase: next, events }
  }

  const session: PomodoroSession = {
    get currentPhase() { return currentPhaseAsTimerPhase() },
    get isRunning() { return isRunning },
    get elapsedMs() { return elapsedMs },
    get remainingMs() { return currentCyclePhase().durationMs - elapsedMs },
    get completedCycles() { return completedCycles },
    get currentSet() { return currentCyclePhase().setNumber },
    get totalSets() { return config.setsPerCycle },
    get completedSets() { return completedSetsInCycle },

    start(): TimerEvent[] {
      if (isRunning) return []
      isRunning = true
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

      events.push({ type: 'TimerTicked', remainingMs: currentCyclePhase().durationMs - elapsedMs })
      return events
    },

    pause(): TimerEvent[] {
      if (!isRunning) return []
      isRunning = false
      return [{ type: 'TimerPaused', elapsedMs }]
    },

    reset(): TimerEvent[] {
      isRunning = false
      elapsedMs = 0
      phaseIndex = 0
      completedCycles = 0
      completedSetsInCycle = 0
      return [{ type: 'TimerReset' }]
    }
  }

  return session
}
