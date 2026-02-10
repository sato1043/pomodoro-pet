import type { AppMode, AppModeEvent } from './AppMode'
import type { EventBus } from '../../domain/shared/EventBus'

export interface AppModeManager {
  readonly currentMode: AppMode
  enterPomodoro(): AppModeEvent[]
  exitPomodoro(): AppModeEvent[]
  dispose(): void
}

export function createAppModeManager(bus: EventBus): AppModeManager {
  let currentMode: AppMode = 'free'

  function now(): number {
    return Date.now()
  }

  function publishEvents(events: AppModeEvent[]): void {
    for (const event of events) {
      bus.publish(event.type, event)
    }
  }

  const unsubCycleCompleted = bus.subscribe('CycleCompleted', () => {
    const events = manager.exitPomodoro()
    publishEvents(events)
  })

  const manager: AppModeManager = {
    get currentMode() { return currentMode },

    enterPomodoro(): AppModeEvent[] {
      if (currentMode === 'pomodoro') return []
      currentMode = 'pomodoro'
      return [{ type: 'AppModeChanged', mode: 'pomodoro', timestamp: now() }]
    },

    exitPomodoro(): AppModeEvent[] {
      if (currentMode === 'free') return []
      currentMode = 'free'
      return [{ type: 'AppModeChanged', mode: 'free', timestamp: now() }]
    },

    dispose(): void {
      unsubCycleCompleted()
    }
  }

  return manager
}
