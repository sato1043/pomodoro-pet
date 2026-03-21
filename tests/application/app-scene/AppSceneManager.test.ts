import { describe, it, expect, beforeEach } from 'vitest'
import { createAppSceneManager, type AppSceneManager } from '../../../src/application/app-scene/AppSceneManager'

describe('AppSceneManager', () => {
  let manager: AppSceneManager

  beforeEach(() => {
    manager = createAppSceneManager()
  })

  describe('初期状態', () => {
    it('currentSceneがfreeである', () => {
      expect(manager.currentScene).toBe('free')
    })
  })

  describe('enterPomodoro', () => {
    it('pomodoroに遷移する', () => {
      manager.enterPomodoro()
      expect(manager.currentScene).toBe('pomodoro')
    })

    it('AppSceneChanged(pomodoro)イベントを返す', () => {
      const events = manager.enterPomodoro()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'pomodoro' })
      )
    })

    it('既にpomodoroの時は空配列を返す', () => {
      manager.enterPomodoro()
      const events = manager.enterPomodoro()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('pomodoro')
    })
  })

  describe('exitPomodoro', () => {
    it('freeに遷移する', () => {
      manager.enterPomodoro()
      manager.exitPomodoro()
      expect(manager.currentScene).toBe('free')
    })

    it('AppSceneChanged(free)イベントを返す', () => {
      manager.enterPomodoro()
      const events = manager.exitPomodoro()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'free' })
      )
    })

    it('既にfreeの時は空配列を返す', () => {
      const events = manager.exitPomodoro()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('free')
    })
  })

  describe('enterFureai', () => {
    it('fureaiに遷移する', () => {
      manager.enterFureai()
      expect(manager.currentScene).toBe('fureai')
    })

    it('AppSceneChanged(fureai)イベントを返す', () => {
      const events = manager.enterFureai()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'fureai' })
      )
    })

    it('既にfureaiの時は空配列を返す', () => {
      manager.enterFureai()
      const events = manager.enterFureai()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('fureai')
    })

    it('pomodoroからは遷移できない', () => {
      manager.enterPomodoro()
      const events = manager.enterFureai()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('pomodoro')
    })
  })

  describe('exitFureai', () => {
    it('freeに遷移する', () => {
      manager.enterFureai()
      manager.exitFureai()
      expect(manager.currentScene).toBe('free')
    })

    it('AppSceneChanged(free)イベントを返す', () => {
      manager.enterFureai()
      const events = manager.exitFureai()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'free' })
      )
    })

    it('fureai以外の時は空配列を返す', () => {
      const events = manager.exitFureai()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('free')
    })
  })

  describe('enterGallery', () => {
    it('galleryに遷移する', () => {
      manager.enterGallery()
      expect(manager.currentScene).toBe('gallery')
    })

    it('AppSceneChanged(gallery)イベントを返す', () => {
      const events = manager.enterGallery()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'gallery' })
      )
    })

    it('既にgalleryの時は空配列を返す', () => {
      manager.enterGallery()
      const events = manager.enterGallery()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('gallery')
    })

    it('pomodoroからは遷移できない', () => {
      manager.enterPomodoro()
      const events = manager.enterGallery()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('pomodoro')
    })
  })

  describe('exitGallery', () => {
    it('freeに遷移する', () => {
      manager.enterGallery()
      manager.exitGallery()
      expect(manager.currentScene).toBe('free')
    })

    it('AppSceneChanged(free)イベントを返す', () => {
      manager.enterGallery()
      const events = manager.exitGallery()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'free' })
      )
    })

    it('gallery以外の時は空配列を返す', () => {
      const events = manager.exitGallery()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('free')
    })
  })

  describe('enterEnvironment', () => {
    it('environmentに遷移する', () => {
      manager.enterEnvironment()
      expect(manager.currentScene).toBe('environment')
    })

    it('AppSceneChanged(environment)イベントを返す', () => {
      const events = manager.enterEnvironment()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'environment' })
      )
    })

    it('既にenvironmentの時は空配列を返す', () => {
      manager.enterEnvironment()
      const events = manager.enterEnvironment()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('environment')
    })

    it('pomodoroからは遷移できない', () => {
      manager.enterPomodoro()
      const events = manager.enterEnvironment()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('pomodoro')
    })
  })

  describe('exitEnvironment', () => {
    it('freeに遷移する', () => {
      manager.enterEnvironment()
      manager.exitEnvironment()
      expect(manager.currentScene).toBe('free')
    })

    it('AppSceneChanged(free)イベントを返す', () => {
      manager.enterEnvironment()
      const events = manager.exitEnvironment()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'free' })
      )
    })

    it('environment以外の時は空配列を返す', () => {
      const events = manager.exitEnvironment()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('free')
    })
  })

  describe('状態遷移の全サイクル', () => {
    it('free → pomodoro → free の全遷移が正常に動作する', () => {
      expect(manager.currentScene).toBe('free')

      manager.enterPomodoro()
      expect(manager.currentScene).toBe('pomodoro')

      manager.exitPomodoro()
      expect(manager.currentScene).toBe('free')
    })

    it('free → fureai → free の全遷移が正常に動作する', () => {
      expect(manager.currentScene).toBe('free')

      manager.enterFureai()
      expect(manager.currentScene).toBe('fureai')

      manager.exitFureai()
      expect(manager.currentScene).toBe('free')
    })

    it('fureaiからpomodoroへは直接遷移できない', () => {
      manager.enterFureai()
      const events = manager.enterPomodoro()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('fureai')
    })

    it('free → gallery → free の全遷移が正常に動作する', () => {
      expect(manager.currentScene).toBe('free')

      manager.enterGallery()
      expect(manager.currentScene).toBe('gallery')

      manager.exitGallery()
      expect(manager.currentScene).toBe('free')
    })

    it('galleryからpomodoroへは直接遷移できない', () => {
      manager.enterGallery()
      const events = manager.enterPomodoro()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('gallery')
    })

    it('galleryからfureaiへは直接遷移できない', () => {
      manager.enterGallery()
      const events = manager.enterFureai()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('gallery')
    })

    it('free → environment → free の全遷移が正常に動作する', () => {
      expect(manager.currentScene).toBe('free')

      manager.enterEnvironment()
      expect(manager.currentScene).toBe('environment')

      manager.exitEnvironment()
      expect(manager.currentScene).toBe('free')
    })

    it('environmentからpomodoroへは直接遷移できない', () => {
      manager.enterEnvironment()
      const events = manager.enterPomodoro()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('environment')
    })

    it('environmentからfureaiへは直接遷移できない', () => {
      manager.enterEnvironment()
      const events = manager.enterFureai()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('environment')
    })

    it('environmentからgalleryへは直接遷移できない', () => {
      manager.enterEnvironment()
      const events = manager.enterGallery()
      expect(events).toHaveLength(0)
      expect(manager.currentScene).toBe('environment')
    })
  })
})
