import type { EventBus } from '../../domain/shared/EventBus'
import type { AppSceneManager } from '../app-scene/AppSceneManager'
import type { AppSceneEvent } from '../app-scene/AppScene'

export interface EnvironmentCoordinatorDeps {
  readonly bus: EventBus
  readonly sceneManager: AppSceneManager
}

export interface EnvironmentCoordinator {
  enterEnvironment(): void
  exitEnvironment(): void
}

export function createEnvironmentCoordinator(
  deps: EnvironmentCoordinatorDeps
): EnvironmentCoordinator {
  const { bus, sceneManager } = deps

  function publishSceneEvents(events: AppSceneEvent[]): void {
    for (const event of events) {
      bus.publish(event.type, event)
    }
  }

  return {
    enterEnvironment(): void {
      const sceneEvents = sceneManager.enterEnvironment()
      if (sceneEvents.length === 0) return
      publishSceneEvents(sceneEvents)
      bus.publish('WeatherPreviewOpen', { open: true })
    },

    exitEnvironment(): void {
      bus.publish('WeatherPreviewOpen', { open: false })
      const sceneEvents = sceneManager.exitEnvironment()
      if (sceneEvents.length === 0) return
      publishSceneEvents(sceneEvents)
    }
  }
}
