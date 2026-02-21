import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createFureaiCoordinator, type FureaiCoordinator } from '../../../src/application/fureai/FureaiCoordinator'
import { createAppSceneManager, type AppSceneManager } from '../../../src/application/app-scene/AppSceneManager'
import { createEventBus, type EventBus } from '../../../src/domain/shared/EventBus'
import type { CharacterBehavior } from '../../../src/domain/character/value-objects/BehaviorPreset'
import type { AppSceneEvent } from '../../../src/application/app-scene/AppScene'

describe('FureaiCoordinator', () => {
  let bus: EventBus
  let sceneManager: AppSceneManager
  let coordinator: FureaiCoordinator
  let behaviorChanges: CharacterBehavior[]

  beforeEach(() => {
    bus = createEventBus()
    sceneManager = createAppSceneManager()
    behaviorChanges = []
    coordinator = createFureaiCoordinator({
      bus,
      sceneManager,
      onBehaviorChange: (preset) => { behaviorChanges.push(preset) }
    })
  })

  describe('enterFureai', () => {
    it('シーンをfureaiに遷移する', () => {
      coordinator.enterFureai()
      expect(sceneManager.currentScene).toBe('fureai')
    })

    it('fureai-idleプリセットに切り替える', () => {
      coordinator.enterFureai()
      expect(behaviorChanges).toEqual(['fureai-idle'])
    })

    it('AppSceneChangedイベントをEventBusに発行する', () => {
      const events: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => { events.push(e) })
      coordinator.enterFureai()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'fureai' })
      )
    })

    it('freeでない場合は何もしない', () => {
      sceneManager.enterPomodoro()
      behaviorChanges = []
      coordinator.enterFureai()
      expect(sceneManager.currentScene).toBe('pomodoro')
      expect(behaviorChanges).toHaveLength(0)
    })
  })

  describe('exitFureai', () => {
    it('シーンをfreeに遷移する', () => {
      coordinator.enterFureai()
      coordinator.exitFureai()
      expect(sceneManager.currentScene).toBe('free')
    })

    it('autonomousプリセットに切り替える', () => {
      coordinator.enterFureai()
      behaviorChanges = []
      coordinator.exitFureai()
      expect(behaviorChanges).toEqual(['autonomous'])
    })

    it('AppSceneChangedイベントをEventBusに発行する', () => {
      coordinator.enterFureai()
      const events: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => { events.push(e) })
      coordinator.exitFureai()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'free' })
      )
    })

    it('fureaiでない場合は何もしない', () => {
      const events: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => { events.push(e) })
      coordinator.exitFureai()
      expect(sceneManager.currentScene).toBe('free')
      expect(events).toHaveLength(0)
    })
  })

  describe('遷移サイクル', () => {
    it('free → fureai → free の全遷移が正常に動作する', () => {
      expect(sceneManager.currentScene).toBe('free')

      coordinator.enterFureai()
      expect(sceneManager.currentScene).toBe('fureai')
      expect(behaviorChanges).toEqual(['fureai-idle'])

      coordinator.exitFureai()
      expect(sceneManager.currentScene).toBe('free')
      expect(behaviorChanges).toEqual(['fureai-idle', 'autonomous'])
    })
  })
})
