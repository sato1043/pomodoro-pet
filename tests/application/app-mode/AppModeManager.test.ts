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

    it('congratsの時は空配列を返す', () => {
      manager.enterPomodoro()
      manager.completeCycle()
      const events = manager.enterPomodoro()
      expect(events).toHaveLength(0)
      expect(manager.currentMode).toBe('congrats')
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

    it('congratsの時は空配列を返す', () => {
      manager.enterPomodoro()
      manager.completeCycle()
      const events = manager.exitPomodoro()
      expect(events).toHaveLength(0)
      expect(manager.currentMode).toBe('congrats')
    })
  })

  describe('completeCycle', () => {
    it('congratsに遷移する', () => {
      manager.enterPomodoro()
      manager.completeCycle()
      expect(manager.currentMode).toBe('congrats')
    })

    it('AppModeChanged(congrats)イベントを返す', () => {
      manager.enterPomodoro()
      const events = manager.completeCycle()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppModeChanged', mode: 'congrats' })
      )
    })

    it('freeの時は空配列を返す', () => {
      const events = manager.completeCycle()
      expect(events).toHaveLength(0)
      expect(manager.currentMode).toBe('free')
    })

    it('既にcongratsの時は空配列を返す', () => {
      manager.enterPomodoro()
      manager.completeCycle()
      const events = manager.completeCycle()
      expect(events).toHaveLength(0)
      expect(manager.currentMode).toBe('congrats')
    })
  })

  describe('dismissCongrats', () => {
    it('freeに遷移する', () => {
      manager.enterPomodoro()
      manager.completeCycle()
      manager.dismissCongrats()
      expect(manager.currentMode).toBe('free')
    })

    it('AppModeChanged(free)イベントを返す', () => {
      manager.enterPomodoro()
      manager.completeCycle()
      const events = manager.dismissCongrats()
      expect(events).toHaveLength(1)
      expect(events[0]).toEqual(
        expect.objectContaining({ type: 'AppModeChanged', mode: 'free' })
      )
    })

    it('freeの時は空配列を返す', () => {
      const events = manager.dismissCongrats()
      expect(events).toHaveLength(0)
      expect(manager.currentMode).toBe('free')
    })

    it('pomodoroの時は空配列を返す', () => {
      manager.enterPomodoro()
      const events = manager.dismissCongrats()
      expect(events).toHaveLength(0)
      expect(manager.currentMode).toBe('pomodoro')
    })
  })

  describe('CycleCompleted自動遷移', () => {
    it('CycleCompletedイベントで自動的にcongratsに遷移する', () => {
      manager.enterPomodoro()
      expect(manager.currentMode).toBe('pomodoro')

      bus.publish('CycleCompleted', {
        type: 'CycleCompleted',
        cycleNumber: 1,
        timestamp: Date.now()
      })

      expect(manager.currentMode).toBe('congrats')
    })

    it('CycleCompleted時にAppModeChanged(congrats)がEventBusに発行される', () => {
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
        expect.objectContaining({ type: 'AppModeChanged', mode: 'congrats' })
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

  describe('状態遷移の全サイクル', () => {
    it('free → pomodoro → congrats → free の全遷移が正常に動作する', () => {
      expect(manager.currentMode).toBe('free')

      manager.enterPomodoro()
      expect(manager.currentMode).toBe('pomodoro')

      manager.completeCycle()
      expect(manager.currentMode).toBe('congrats')

      manager.dismissCongrats()
      expect(manager.currentMode).toBe('free')
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
