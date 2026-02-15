import { describe, it, expect, beforeEach } from 'vitest'
import { createAppSceneManager, type AppSceneManager } from '../../../src/application/app-scene/AppSceneManager'
import { createEventBus } from '../../../src/domain/shared/EventBus'
import type { EventBus } from '../../../src/domain/shared/EventBus'
import type { AppSceneEvent } from '../../../src/application/app-scene/AppScene'

describe('AppSceneManager', () => {
  let bus: EventBus
  let manager: AppSceneManager

  beforeEach(() => {
    bus = createEventBus()
    manager = createAppSceneManager(bus)
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

  describe('CycleCompleted自動遷移', () => {
    it('CycleCompletedイベントでexitPomodoroが呼ばれfreeに遷移する', () => {
      manager.enterPomodoro()
      expect(manager.currentScene).toBe('pomodoro')

      bus.publish('CycleCompleted', {
        type: 'CycleCompleted',
        cycleNumber: 1,
        timestamp: Date.now()
      })

      expect(manager.currentScene).toBe('free')
    })

    it('CycleCompleted時にAppSceneChanged(free)がEventBusに発行される', () => {
      manager.enterPomodoro()

      const received: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (event) => {
        received.push(event)
      })

      bus.publish('CycleCompleted', {
        type: 'CycleCompleted',
        cycleNumber: 1,
        timestamp: Date.now()
      })

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual(
        expect.objectContaining({ type: 'AppSceneChanged', scene: 'free' })
      )
    })

    it('freeの時にCycleCompletedが来ても何もしない', () => {
      const received: AppSceneEvent[] = []
      bus.subscribe<AppSceneEvent>('AppSceneChanged', (event) => {
        received.push(event)
      })

      bus.publish('CycleCompleted', {
        type: 'CycleCompleted',
        cycleNumber: 1,
        timestamp: Date.now()
      })

      expect(manager.currentScene).toBe('free')
      expect(received).toHaveLength(0)
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

  describe('dispose', () => {
    it('dispose後はCycleCompletedに反応しない', () => {
      manager.enterPomodoro()
      manager.dispose()

      bus.publish('CycleCompleted', {
        type: 'CycleCompleted',
        cycleNumber: 1,
        timestamp: Date.now()
      })

      expect(manager.currentScene).toBe('pomodoro')
    })
  })
})
