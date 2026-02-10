import type { TimerConfig } from '../value-objects/TimerConfig'
import type { TimerPhase } from '../value-objects/TimerPhase'
import { createWorkPhase, createBreakPhase, createLongBreakPhase } from '../value-objects/TimerPhase'
import type { TimerEvent } from '../events/TimerEvents'

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
  let currentPhase: TimerPhase = createWorkPhase(config.workDurationMs)
  let isRunning = false
  let elapsedMs = 0
  let completedCycles = 0
  let currentSet = 1
  let completedSetsInCycle = 0

  function now(): number {
    return Date.now()
  }

  function nextPhase(): { phase: TimerPhase; events: TimerEvent[] } {
    const events: TimerEvent[] = []
    const completedType = currentPhase.type

    events.push({ type: 'PhaseCompleted', phase: completedType, timestamp: now() })

    let next: TimerPhase

    if (completedType === 'work') {
      if (currentSet >= config.setsPerCycle) {
        next = createLongBreakPhase(config.longBreakDurationMs)
      } else {
        next = createBreakPhase(config.breakDurationMs)
      }
    } else if (completedType === 'break') {
      completedSetsInCycle++
      events.push({
        type: 'SetCompleted',
        setNumber: currentSet,
        totalSets: config.setsPerCycle,
        timestamp: now()
      })
      currentSet++
      next = createWorkPhase(config.workDurationMs)
    } else {
      // long-break完了
      completedSetsInCycle++
      events.push({
        type: 'SetCompleted',
        setNumber: currentSet,
        totalSets: config.setsPerCycle,
        timestamp: now()
      })
      completedCycles++
      events.push({
        type: 'CycleCompleted',
        cycleNumber: completedCycles,
        timestamp: now()
      })
      currentSet = 1
      completedSetsInCycle = 0
      isRunning = false
      next = createWorkPhase(config.workDurationMs)
    }

    // サイクル完了（自動停止）時はPhaseStartedを発行しない
    // 次回start()でPhaseStartedが発行される
    if (isRunning) {
      events.push({ type: 'PhaseStarted', phase: next.type, timestamp: now() })
    }
    return { phase: next, events }
  }

  const session: PomodoroSession = {
    get currentPhase() { return currentPhase },
    get isRunning() { return isRunning },
    get elapsedMs() { return elapsedMs },
    get remainingMs() { return currentPhase.durationMs - elapsedMs },
    get completedCycles() { return completedCycles },
    get currentSet() { return currentSet },
    get totalSets() { return config.setsPerCycle },
    get completedSets() { return completedSetsInCycle },

    start(): TimerEvent[] {
      if (isRunning) return []
      isRunning = true
      return [{ type: 'PhaseStarted', phase: currentPhase.type, timestamp: now() }]
    },

    tick(deltaMs: number): TimerEvent[] {
      if (!isRunning) return []

      const events: TimerEvent[] = []
      elapsedMs += deltaMs

      while (elapsedMs >= currentPhase.durationMs) {
        const overflow = elapsedMs - currentPhase.durationMs
        const transition = nextPhase()
        events.push(...transition.events)
        currentPhase = transition.phase
        elapsedMs = overflow
      }

      events.push({ type: 'TimerTicked', remainingMs: currentPhase.durationMs - elapsedMs })
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
      currentPhase = createWorkPhase(config.workDurationMs)
      completedCycles = 0
      currentSet = 1
      completedSetsInCycle = 0
      return [{ type: 'TimerReset' }]
    }
  }

  return session
}
