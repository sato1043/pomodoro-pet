import type { AppScene, AppSceneEvent } from './AppScene'
import type { EventBus } from '../../domain/shared/EventBus'

export interface AppSceneManager {
  readonly currentScene: AppScene
  enterPomodoro(): AppSceneEvent[]
  exitPomodoro(): AppSceneEvent[]
  dispose(): void
}

export function createAppSceneManager(bus: EventBus): AppSceneManager {
  let currentScene: AppScene = 'free'

  function now(): number {
    return Date.now()
  }

  function publishEvents(events: AppSceneEvent[]): void {
    for (const event of events) {
      bus.publish(event.type, event)
    }
  }

  const unsubCycleCompleted = bus.subscribe('CycleCompleted', () => {
    const events = manager.exitPomodoro()
    publishEvents(events)
  })

  const manager: AppSceneManager = {
    get currentScene() { return currentScene },

    enterPomodoro(): AppSceneEvent[] {
      if (currentScene !== 'free') return []
      currentScene = 'pomodoro'
      return [{ type: 'AppSceneChanged', scene: 'pomodoro', timestamp: now() }]
    },

    exitPomodoro(): AppSceneEvent[] {
      if (currentScene !== 'pomodoro') return []
      currentScene = 'free'
      return [{ type: 'AppSceneChanged', scene: 'free', timestamp: now() }]
    },

    dispose(): void {
      unsubCycleCompleted()
    }
  }

  return manager
}
