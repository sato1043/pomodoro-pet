import type { EventBus } from '../../domain/shared/EventBus'
import type { AppSceneManager } from '../app-scene/AppSceneManager'
import type { AppSceneEvent } from '../app-scene/AppScene'
import type { CharacterBehavior } from '../../domain/character/value-objects/BehaviorPreset'

export interface FureaiCoordinatorDeps {
  readonly bus: EventBus
  readonly sceneManager: AppSceneManager
  readonly onBehaviorChange: (presetName: CharacterBehavior) => void
}

export interface FureaiCoordinator {
  enterFureai(): void
  exitFureai(): void
}

export function createFureaiCoordinator(
  deps: FureaiCoordinatorDeps
): FureaiCoordinator {
  const { bus, sceneManager, onBehaviorChange } = deps

  function publishSceneEvents(events: AppSceneEvent[]): void {
    for (const event of events) {
      bus.publish(event.type, event)
    }
  }

  return {
    enterFureai(): void {
      const sceneEvents = sceneManager.enterFureai()
      if (sceneEvents.length === 0) return
      publishSceneEvents(sceneEvents)
      onBehaviorChange('fureai-idle')
    },

    exitFureai(): void {
      const sceneEvents = sceneManager.exitFureai()
      if (sceneEvents.length === 0) return
      publishSceneEvents(sceneEvents)
      onBehaviorChange('autonomous')
    }
  }
}
