import { describe, it, expect, beforeEach } from 'vitest'
import { createAppModeManager, type AppModeManager } from '../../../src/application/app-mode/AppModeManager'
import { createEventBus } from '../../../src/domain/shared/EventBus'
import type { EventBus } from '../../../src/domain/shared/EventBus'
import type { AppModeEvent } from '../../../src/application/app-mode/AppMode'

describe('AppModeManager', () => {
  let bus: EventBus
  let manager: AppModeManager

  beforeEach(() => {
    bus = createEventBus()
    manager = createAppModeManager(bus)
  })

  describe('初期状態', () => {
    it('currentModeがfreeである', () => {
      expect(manager.currentMode).toBe('free')
    })
  })

  describe('enterPomodoro', () => {
    it('pomodoroに遷移する', () => {
      manager.enterPomodoro()
      expect(manager.currentMode).toBe('pomodoro')
    })

    it('AppModeChanged(pomodoro)イベントを返す', () => {
      const events = manager.enterPomodoro()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppModeChanged', mode: 'pomodoro' })
      )
    })

    it('既にpomodoroの時は空配列を返す', () => {
      manager.enterPomodoro()
      const events = manager.enterPomodoro()
      expect(events).toHaveLength(0)
      expect(manager.currentMode).toBe('pomodoro')
    })
  })

  describe('exitPomodoro', () => {
    it('freeに遷移する', () => {
      manager.enterPomodoro()
      manager.exitPomodoro()
      expect(manager.currentMode).toBe('free')
    })

    it('AppModeChanged(free)イベントを返す', () => {
      manager.enterPomodoro()
      const events = manager.exitPomodoro()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppModeChanged', mode: 'free' })
      )
    })

    it('既にfreeの時は空配列を返す', () => {
      const events = manager.exitPomodoro()
      expect(events).toHaveLength(0)
      expect(manager.currentMode).toBe('free')
    })
  })

  describe('CycleCompleted自動遷移', () => {
    it('CycleCompletedイベントで自動的にfreeに遷移する', () => {
      manager.enterPomodoro()
      expect(manager.currentMode).toBe('pomodoro')

      bus.publish('CycleCompleted', {
        type: 'CycleCompleted',
        cycleNumber: 1,
        timestamp: Date.now()
      })

      expect(manager.currentMode).toBe('free')
    })

    it('CycleCompleted時にAppModeChanged(free)がEventBusに発行される', () => {
      manager.enterPomodoro()

      const received: AppModeEvent[] = []
      bus.subscribe<AppModeEvent>('AppModeChanged', (event) => {
        received.push(event)
      })

      bus.publish('CycleCompleted', {
        type: 'CycleCompleted',
        cycleNumber: 1,
        timestamp: Date.now()
      })

      expect(received).toHaveLength(1)
      expect(received[0]).toEqual(
        expect.objectContaining({ type: 'AppModeChanged', mode: 'free' })
      )
    })

    it('freeの時にCycleCompletedが来ても何もしない', () => {
      const received: AppModeEvent[] = []
      bus.subscribe<AppModeEvent>('AppModeChanged', (event) => {
        received.push(event)
      })

      bus.publish('CycleCompleted', {
        type: 'CycleCompleted',
        cycleNumber: 1,
        timestamp: Date.now()
      })

      expect(manager.currentMode).toBe('free')
      expect(received).toHaveLength(0)
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

      expect(manager.currentMode).toBe('pomodoro')
    })
  })
})
