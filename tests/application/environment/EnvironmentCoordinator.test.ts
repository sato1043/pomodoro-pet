import { describe, it, expect, beforeEach } from 'vitest'
import { createEnvironmentCoordinator, type EnvironmentCoordinator } from '../../../src/application/environment/EnvironmentCoordinator'
import { createAppSceneManager, type AppSceneManager } from '../../../src/application/app-scene/AppSceneManager'
import { createEventBus, type EventBus } from '../../../src/domain/shared/EventBus'
import type { AppSceneEvent } from '../../../src/application/app-scene/AppScene'

describe('EnvironmentCoordinator', () => {
  let bus: EventBus
  let sceneManager: AppSceneManager
  let coordinator: EnvironmentCoordinator

  beforeEach(() => {
    bus = createEventBus()
    sceneManager = createAppSceneManager()
    coordinator = createEnvironmentCoordinator({ bus, sceneManager })
  })

  describe('enterEnvironment', () => {
    it('シーンをenvironmentに遷移する', () => {
      coordinator.enterEnvironment()
      expect(sceneManager.currentScene).toBe('environment')
    })

    it('AppSceneChangedイベントをEventBusに発行する', () => {
      const events: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => { events.push(e) })
      coordinator.enterEnvironment()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'environment' })
      )
    })

    it('WeatherPreviewOpenイベントを発行する', () => {
      const previews: { open: boolean }[] = []
      bus.subscribe<{ open: boolean }>('WeatherPreviewOpen', (e) => { previews.push(e) })
      coordinator.enterEnvironment()
      expect(previews).toHaveLength(1)
      expect(previews[0]).toEqual({ open: true })
    })

    it('freeでない場合は何もしない', () => {
      sceneManager.enterPomodoro()
      const events: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => { events.push(e) })
      coordinator.enterEnvironment()
      expect(sceneManager.currentScene).toBe('pomodoro')
      expect(events).toHaveLength(0)
    })
  })

  describe('exitEnvironment', () => {
    it('シーンをfreeに遷移する', () => {
      coordinator.enterEnvironment()
      coordinator.exitEnvironment()
      expect(sceneManager.currentScene).toBe('free')
    })

    it('AppSceneChangedイベントをEventBusに発行する', () => {
      coordinator.enterEnvironment()
      const events: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => { events.push(e) })
      coordinator.exitEnvironment()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'free' })
      )
    })

    it('WeatherPreviewOpenイベントをclose発行する', () => {
      coordinator.enterEnvironment()
      const previews: { open: boolean }[] = []
      bus.subscribe<{ open: boolean }>('WeatherPreviewOpen', (e) => { previews.push(e) })
      coordinator.exitEnvironment()
      expect(previews).toHaveLength(1)
      expect(previews[0]).toEqual({ open: false })
    })

    it('environmentでない場合はWeatherPreviewOpenのみ発行しシーン遷移しない', () => {
      const events: AppSceneEvent[] = []
      const previews: { open: boolean }[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (e) => { events.push(e) })
      bus.subscribe<{ open: boolean }>('WeatherPreviewOpen', (e) => { previews.push(e) })
      coordinator.exitEnvironment()
      expect(sceneManager.currentScene).toBe('free')
      expect(events).toHaveLength(0)
      expect(previews).toHaveLength(1)
      expect(previews[0]).toEqual({ open: false })
    })
  })

  describe('遷移サイクル', () => {
    it('free → environment → free の全遷移が正常に動作する', () => {
      expect(sceneManager.currentScene).toBe('free')

      coordinator.enterEnvironment()
      expect(sceneManager.currentScene).toBe('environment')

      coordinator.exitEnvironment()
      expect(sceneManager.currentScene).toBe('free')
    })
  })
})
