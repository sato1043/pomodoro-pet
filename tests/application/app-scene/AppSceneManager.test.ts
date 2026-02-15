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

  describe('状態遷移の全サイクル', () => {
    it('free → pomodoro → free の全遷移が正常に動作する', () => {
      expect(manager.currentScene).toBe('free')

      manager.enterPomodoro()
      expect(manager.currentScene).toBe('pomodoro')

      manager.exitPomodoro()
      expect(manager.currentScene).toBe('free')
    })
  })
})
