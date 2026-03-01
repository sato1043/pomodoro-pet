import type { EventBus } from '../../domain/shared/EventBus'
import type { AppSceneManager } from '../app-scene/AppSceneManager'
import type { AppSceneEvent } from '../app-scene/AppScene'
import type { CharacterBehavior } from '../../domain/character/value-objects/BehaviorPreset'
import type { CharacterStateName } from '../../domain/character/value-objects/CharacterState'
import type { AnimationSelection } from '../../domain/character/services/AnimationResolver'

export interface GalleryCharacterHandle {
  playState(state: CharacterStateName): void
  playAnimation(selection: AnimationSelection): void
  stopAnimation(): void
  setPosition(x: number, y: number, z: number): void
}

/** ギャラリーモード中のキャラクターX位置オフセット（右サイドリストとの被り回避） */
const GALLERY_CHAR_OFFSET_X = -0.28

export interface GalleryCoordinatorDeps {
  readonly bus: EventBus
  readonly sceneManager: AppSceneManager
  readonly onBehaviorChange: (presetName: CharacterBehavior) => void
  readonly charHandle: GalleryCharacterHandle
}

export interface GalleryCoordinator {
  enterGallery(): void
  exitGallery(): void
  applyCharacterOffset(): void
  resetCharacterOffset(): void
  playState(state: CharacterStateName): void
  playAnimationSelection(selection: AnimationSelection): void
}

export function createGalleryCoordinator(
  deps: GalleryCoordinatorDeps
): GalleryCoordinator {
  const { bus, sceneManager, onBehaviorChange, charHandle } = deps

  function publishSceneEvents(events: AppSceneEvent[]): void {
    for (const event of events) {
      bus.publish(event.type, event)
    }
  }

  return {
    enterGallery(): void {
      const sceneEvents = sceneManager.enterGallery()
      if (sceneEvents.length === 0) return
      publishSceneEvents(sceneEvents)
    },

    exitGallery(): void {
      const sceneEvents = sceneManager.exitGallery()
      if (sceneEvents.length === 0) return
      publishSceneEvents(sceneEvents)
      onBehaviorChange('autonomous')
    },

    applyCharacterOffset(): void {
      charHandle.setPosition(GALLERY_CHAR_OFFSET_X, 0, 0)
    },

    resetCharacterOffset(): void {
      charHandle.setPosition(0, 0, 0)
    },

    playState(state: CharacterStateName): void {
      charHandle.stopAnimation()
      charHandle.playState(state)
    },

    playAnimationSelection(selection: AnimationSelection): void {
      charHandle.stopAnimation()
      charHandle.playAnimation(selection)
    },
  }
}
