import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createEventBus, type EventBus } from '../../../src/domain/shared/EventBus'
import { bridgeTimerToNotification, type NotificationPort } from '../../../src/application/notification/NotificationBridge'
import type { TimerEvent } from '../../../src/domain/timer/events/TimerEvents'
import type { PomodoroEvent } from '../../../src/application/timer/PomodoroEvents'

function createMockNotification(): NotificationPort & { calls: { title: string; body: string }[] } {
  const calls: { title: string; body: string }[] = []
  return {
    calls,
    show: vi.fn((title: string, body: string) => { calls.push({ title, body }) }),
  }
}

describe('NotificationBridge', () => {
  let bus: EventBus
  let notification: ReturnType<typeof createMockNotification>

  beforeEach(() => {
    bus = createEventBus()
    notification = createMockNotification()
  })

  describe('バックグラウンド+有効時', () => {
    const isEnabled = () => true
    const isFocused = () => false

    it('PhaseCompleted(work)で通知を発行する', () => {
      bridgeTimerToNotification(bus, notification, isEnabled, isFocused)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now(),
      })

      expect(notification.show).toHaveBeenCalledWith('休憩の時間', '作業お疲れ様でした')
    })

    it('PhaseCompleted(break)で通知を発行する', () => {
      bridgeTimerToNotification(bus, notification, isEnabled, isFocused)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'break',
        timestamp: Date.now(),
      })

      expect(notification.show).toHaveBeenCalledWith('作業の時間', '休憩終了、次の作業に取り掛かりましょう')
    })

    it('PomodoroCompletedで通知を発行する', () => {
      bridgeTimerToNotification(bus, notification, isEnabled, isFocused)

      bus.publish<PomodoroEvent>('PomodoroCompleted', {
        type: 'PomodoroCompleted',
        timestamp: Date.now(),
      })

      expect(notification.show).toHaveBeenCalledWith('サイクル完了！', 'ポモドーロサイクルが完了しました')
    })

    it('PhaseCompleted(long-break)では通知しない', () => {
      bridgeTimerToNotification(bus, notification, isEnabled, isFocused)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'long-break',
        timestamp: Date.now(),
      })

      expect(notification.show).not.toHaveBeenCalled()
    })

    it('PhaseCompleted(congrats)では通知しない', () => {
      bridgeTimerToNotification(bus, notification, isEnabled, isFocused)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'congrats',
        timestamp: Date.now(),
      })

      expect(notification.show).not.toHaveBeenCalled()
    })
  })

  describe('フォアグラウンド時', () => {
    it('通知しない', () => {
      bridgeTimerToNotification(bus, notification, () => true, () => true)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now(),
      })

      expect(notification.show).not.toHaveBeenCalled()
    })
  })

  describe('無効時', () => {
    it('通知しない', () => {
      bridgeTimerToNotification(bus, notification, () => false, () => false)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now(),
      })

      expect(notification.show).not.toHaveBeenCalled()
    })
  })

  describe('解除', () => {
    it('解除関数を呼ぶとイベントに反応しなくなる', () => {
      const unsub = bridgeTimerToNotification(bus, notification, () => true, () => false)
      unsub()

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now(),
      })
      bus.publish<PomodoroEvent>('PomodoroCompleted', {
        type: 'PomodoroCompleted',
        timestamp: Date.now(),
      })

      expect(notification.show).not.toHaveBeenCalled()
    })
  })
})
