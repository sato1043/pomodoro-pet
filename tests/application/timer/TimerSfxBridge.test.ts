import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createEventBus, type EventBus } from '../../../src/domain/shared/EventBus'
import { bridgeTimerToSfx } from '../../../src/application/timer/TimerSfxBridge'
import type { SfxPlayer } from '../../../src/infrastructure/audio/SfxPlayer'
import type { TimerEvent } from '../../../src/domain/timer/events/TimerEvents'
import type { AppModeEvent } from '../../../src/application/app-mode/AppMode'

function createMockSfxPlayer(): SfxPlayer & { playCalls: string[] } {
  const playCalls: string[] = []
  return {
    playCalls,
    play: vi.fn(async (url: string) => { playCalls.push(url) }),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    dispose: vi.fn()
  }
}

describe('TimerSfxBridge', () => {
  let bus: EventBus
  let sfx: ReturnType<typeof createMockSfxPlayer>

  beforeEach(() => {
    bus = createEventBus()
    sfx = createMockSfxPlayer()
  })

  describe('PhaseCompleted(work) — work完了音', () => {
    it('デフォルトのwork完了音URLを再生する', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledTimes(1)
      expect(sfx.playCalls[0]).toBe('./audio/work-complete.mp3')
    })

    it('PhaseCompleted(break)では再生しない', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.play).not.toHaveBeenCalled()
    })

    it('PhaseCompleted(long-break)では再生しない', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'long-break',
        timestamp: Date.now()
      })

      expect(sfx.play).not.toHaveBeenCalled()
    })

    it('カスタムworkCompleteUrlを指定できる', () => {
      bridgeTimerToSfx(bus, sfx, { workCompleteUrl: '/audio/custom-work.mp3' })

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now()
      })

      expect(sfx.playCalls[0]).toBe('/audio/custom-work.mp3')
    })
  })

  describe('AppModeChanged(congrats) — サイクル完了ファンファーレ', () => {
    it('デフォルトのファンファーレURLを再生する', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<AppModeEvent>('AppModeChanged', {
        type: 'AppModeChanged',
        mode: 'congrats',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledTimes(1)
      expect(sfx.playCalls[0]).toBe('./audio/fanfare.mp3')
    })

    it('AppModeChanged(free)では再生しない', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<AppModeEvent>('AppModeChanged', {
        type: 'AppModeChanged',
        mode: 'free',
        timestamp: Date.now()
      })

      expect(sfx.play).not.toHaveBeenCalled()
    })

    it('カスタムfanfareUrlを指定できる', () => {
      bridgeTimerToSfx(bus, sfx, { fanfareUrl: '/audio/custom-fanfare.mp3' })

      bus.publish<AppModeEvent>('AppModeChanged', {
        type: 'AppModeChanged',
        mode: 'congrats',
        timestamp: Date.now()
      })

      expect(sfx.playCalls[0]).toBe('/audio/custom-fanfare.mp3')
    })
  })

  describe('work完了音とファンファーレは別のURL', () => {
    it('それぞれ異なるURLで再生される', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now()
      })
      bus.publish<AppModeEvent>('AppModeChanged', {
        type: 'AppModeChanged',
        mode: 'congrats',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledTimes(2)
      expect(sfx.playCalls[0]).toBe('./audio/work-complete.mp3')
      expect(sfx.playCalls[1]).toBe('./audio/fanfare.mp3')
    })
  })

  describe('解除', () => {
    it('解除関数を呼ぶと両方のイベントに反応しなくなる', () => {
      const unsub = bridgeTimerToSfx(bus, sfx)
      unsub()

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now()
      })
      bus.publish<AppModeEvent>('AppModeChanged', {
        type: 'AppModeChanged',
        mode: 'congrats',
        timestamp: Date.now()
      })

      expect(sfx.play).not.toHaveBeenCalled()
    })
  })

  describe('エラーハンドリング', () => {
    it('play失敗時にエラーが伝播しない', async () => {
      const failSfx = createMockSfxPlayer()
      failSfx.play = vi.fn(async () => { throw new Error('AudioContext not allowed') })

      bridgeTimerToSfx(bus, failSfx)

      expect(() => {
        bus.publish<TimerEvent>('PhaseCompleted', {
          type: 'PhaseCompleted',
          phase: 'work',
          timestamp: Date.now()
        })
      }).not.toThrow()
    })
  })
})
