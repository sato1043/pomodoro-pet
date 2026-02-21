import type { EventBus } from '../../domain/shared/EventBus'
import type { AppSceneManager } from '../app-scene/AppSceneManager'
import type { AppSceneEvent } from '../app-scene/AppScene'
import type { CharacterBehavior } from '../../domain/character/value-objects/BehaviorPreset'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'

export interface FeedingAdapter {
  setActive(active: boolean): void
}

export interface FureaiCoordinatorDeps {
  readonly bus: EventBus
  readonly sceneManager: AppSceneManager
  readonly onBehaviorChange: (presetName: CharacterBehavior) => void
  readonly behaviorSM: BehaviorStateMachine
  readonly feedingAdapter?: FeedingAdapter
}

export interface FureaiCoordinator {
  enterFureai(): void
  exitFureai(): void
  feedCharacter(): void
}

export function createFureaiCoordinator(
  deps: FureaiCoordinatorDeps
): FureaiCoordinator {
  const { bus, sceneManager, onBehaviorChange, behaviorSM, feedingAdapter } = deps

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
      feedingAdapter?.setActive(true)
    },

    exitFureai(): void {
      feedingAdapter?.setActive(false)
      const sceneEvents = sceneManager.exitFureai()
      if (sceneEvents.length === 0) return
      publishSceneEvents(sceneEvents)
      onBehaviorChange('autonomous')
    },

    feedCharacter(): void {
      if (sceneManager.currentScene !== 'fureai') return
      behaviorSM.transition({ type: 'interaction', kind: 'feed' })
    }
  }
}
