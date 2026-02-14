import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createEventBus, type EventBus } from '../../../src/domain/shared/EventBus'
import { bridgeTimerToSfx } from '../../../src/application/timer/TimerSfxBridge'
import type { SfxPlayer } from '../../../src/infrastructure/audio/SfxPlayer'
import type { TimerEvent } from '../../../src/domain/timer/events/TimerEvents'

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

  it('PhaseCompleted(work)でファンファーレを再生する', () => {
    bridgeTimerToSfx(bus, sfx)

    bus.publish<TimerEvent>('PhaseCompleted', {
      type: 'PhaseCompleted',
      phase: 'work',
      timestamp: Date.now()
    })

    expect(sfx.play).toHaveBeenCalledTimes(1)
    expect(sfx.playCalls[0]).toBe('/audio/fanfare.mp3')
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

  it('カスタムURLを指定できる', () => {
    bridgeTimerToSfx(bus, sfx, '/audio/custom.mp3')

    bus.publish<TimerEvent>('PhaseCompleted', {
      type: 'PhaseCompleted',
      phase: 'work',
      timestamp: Date.now()
    })

    expect(sfx.playCalls[0]).toBe('/audio/custom.mp3')
  })

  it('解除関数を呼ぶとイベントに反応しなくなる', () => {
    const unsub = bridgeTimerToSfx(bus, sfx)
    unsub()

    bus.publish<TimerEvent>('PhaseCompleted', {
      type: 'PhaseCompleted',
      phase: 'work',
      timestamp: Date.now()
    })

    expect(sfx.play).not.toHaveBeenCalled()
  })

  it('play失敗時にエラーが伝播しない', async () => {
    const failSfx = createMockSfxPlayer()
    failSfx.play = vi.fn(async () => { throw new Error('AudioContext not allowed') })

    bridgeTimerToSfx(bus, failSfx)

    // 例外が伝播しないことを確認（publishが正常に戻る）
    expect(() => {
      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now()
      })
    }).not.toThrow()
  })
})
