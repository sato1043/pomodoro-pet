import type { TimerConfig } from '../value-objects/TimerConfig'
import type { TimerPhase } from '../value-objects/TimerPhase'
import { createWorkPhase, createBreakPhase } from '../value-objects/TimerPhase'
import type { TimerEvent } from '../events/TimerEvents'

export interface PomodoroSession {
  readonly currentPhase: TimerPhase
  readonly isRunning: boolean
  readonly elapsedMs: number
  readonly remainingMs: number
  readonly completedCycles: number
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

  function now(): number {
    return Date.now()
  }

  function nextPhase(): { phase: TimerPhase; events: TimerEvent[] } {
    const events: TimerEvent[] = []
    const completedType = currentPhase.type

    events.push({ type: 'PhaseCompleted', phase: completedType, timestamp: now() })

    if (completedType === 'break') {
      completedCycles++
    }

    const next = completedType === 'work'
      ? createBreakPhase(config.breakDurationMs)
      : createWorkPhase(config.workDurationMs)

    events.push({ type: 'PhaseStarted', phase: next.type, timestamp: now() })

    return { phase: next, events }
  }

  const session: PomodoroSession = {
    get currentPhase() { return currentPhase },
    get isRunning() { return isRunning },
    get elapsedMs() { return elapsedMs },
    get remainingMs() { return currentPhase.durationMs - elapsedMs },
    get completedCycles() { return completedCycles },

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
      return [{ type: 'TimerReset' }]
    }
  }

  return session
}
