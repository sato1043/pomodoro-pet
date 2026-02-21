import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createEventBus, type EventBus } from '../../../src/domain/shared/EventBus'
import { bridgeTimerToSfx, type AudioControl } from '../../../src/application/timer/TimerSfxBridge'
import type { SfxPlayer } from '../../../src/infrastructure/audio/SfxPlayer'
import type { TimerEvent } from '../../../src/domain/timer/events/TimerEvents'
import type { PomodoroEvent } from '../../../src/application/timer/PomodoroEvents'

function createMockSfxPlayer(): SfxPlayer & { playCalls: string[]; loopCalls: string[] } {
  const playCalls: string[] = []
  const loopCalls: string[] = []
  return {
    playCalls,
    loopCalls,
    play: vi.fn(async (url: string) => { playCalls.push(url) }),
    playLoop: vi.fn(async (url: string) => { loopCalls.push(url) }),
    stop: vi.fn(),
    setVolume: vi.fn(),
    setMuted: vi.fn(),
    dispose: vi.fn()
  }
}

function createMockAudioControl(): AudioControl & { presetHistory: string[] } {
  let preset = 'rain'
  const presetHistory: string[] = []
  return {
    presetHistory,
    get currentPreset() { return preset },
    switchPreset(p: string) {
      preset = p
      presetHistory.push(p)
    }
  }
}

describe('TimerSfxBridge', () => {
  let bus: EventBus
  let sfx: ReturnType<typeof createMockSfxPlayer>

  beforeEach(() => {
    bus = createEventBus()
    sfx = createMockSfxPlayer()
  })

  describe('PhaseCompleted(work) → PhaseStarted(break) — work完了音', () => {
    it('work→break時にwork完了音を再生する', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now()
      })
      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledWith('./audio/work-complete.mp3', 1.0)
    })

    it('work→congrats時にはwork完了音を再生しない（ファンファーレのみ）', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now()
      })
      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'congrats',
        timestamp: Date.now()
      })

      expect(sfx.play).not.toHaveBeenCalledWith('./audio/work-complete.mp3', expect.anything())
      expect(sfx.play).toHaveBeenCalledWith('./audio/fanfare.mp3', 1.0)
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
      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledWith('/audio/custom-work.mp3', 1.0)
    })
  })

  describe('PhaseStarted(work) — work開始音', () => {
    it('デフォルトのwork開始音URLを再生する', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'work',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledWith('./audio/work-start.mp3', 1.0)
    })

    it('PhaseStarted(break)ではwork開始音を再生しない', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.play).not.toHaveBeenCalledWith('./audio/work-start.mp3', expect.anything())
    })
  })

  describe('PhaseStarted(break/long-break) — break開始音', () => {
    it('break開始時にbreak-start音を再生する', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledWith('./audio/break-start.mp3', 1.0)
    })

    it('long-break開始時にもbreak-start音を再生する', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'long-break',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledWith('./audio/break-start.mp3', 1.0)
    })

    it('PhaseStarted(work)ではbreak-start音を再生しない', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'work',
        timestamp: Date.now()
      })

      expect(sfx.play).not.toHaveBeenCalledWith('./audio/break-start.mp3', expect.anything())
    })
  })

  describe('PhaseStarted(congrats) — サイクル完了ファンファーレ', () => {
    it('デフォルトのファンファーレURLを再生する', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'congrats',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledWith('./audio/fanfare.mp3', 1.0)
    })

    it('PhaseStarted(work)ではファンファーレを再生しない', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'work',
        timestamp: Date.now()
      })

      expect(sfx.play).not.toHaveBeenCalledWith('./audio/fanfare.mp3', expect.anything())
    })

    it('カスタムfanfareUrlを指定できる', () => {
      bridgeTimerToSfx(bus, sfx, { fanfareUrl: '/audio/custom-fanfare.mp3' })

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'congrats',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledWith('/audio/custom-fanfare.mp3', 1.0)
    })
  })

  describe('work完了音とファンファーレの使い分け', () => {
    it('work→break: work完了音のみ再生される', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now()
      })
      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledWith('./audio/work-complete.mp3', 1.0)
      expect(sfx.play).not.toHaveBeenCalledWith('./audio/fanfare.mp3', expect.anything())
    })

    it('work→congrats: ファンファーレのみ再生される', () => {
      bridgeTimerToSfx(bus, sfx)

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now()
      })
      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'congrats',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledTimes(1)
      expect(sfx.play).toHaveBeenCalledWith('./audio/fanfare.mp3', 1.0)
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
      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'congrats',
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

  describe('休憩BGM', () => {
    let audioCtl: ReturnType<typeof createMockAudioControl>

    beforeEach(() => {
      audioCtl = createMockAudioControl()
    })

    it('PhaseStarted(break) → 環境音silence + chillクロスフェードループ再生', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(audioCtl.presetHistory).toContain('silence')
      expect(sfx.playLoop).toHaveBeenCalledWith('./audio/break-chill.mp3', 3000, 1.0)
    })

    it('PhaseStarted(long-break) → 環境音silence + chillクロスフェードループ再生', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'long-break',
        timestamp: Date.now()
      })

      expect(audioCtl.presetHistory).toContain('silence')
      expect(sfx.playLoop).toHaveBeenCalledWith('./audio/break-chill.mp3', 3000, 1.0)
    })

    it('TriggerFired(break-getset) → getsetにクロスフェード切替', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<TimerEvent>('TriggerFired', {
        type: 'TriggerFired',
        triggerId: 'break-getset',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.stop).not.toHaveBeenCalled()
      expect(sfx.playLoop).toHaveBeenCalledWith('./audio/break-getset.mp3', 3000, 1.0)
    })

    it('TriggerFired(long-break-getset) → getsetにクロスフェード切替', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<TimerEvent>('TriggerFired', {
        type: 'TriggerFired',
        triggerId: 'long-break-getset',
        phase: 'long-break',
        timestamp: Date.now()
      })

      expect(sfx.stop).not.toHaveBeenCalled()
      expect(sfx.playLoop).toHaveBeenCalledWith('./audio/break-getset.mp3', 3000, 1.0)
    })

    it('PhaseCompleted(break) → BGM停止 + 環境音復帰', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      // break開始（環境音が'rain'の状態を保存）
      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })

      // break完了
      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.stop).toHaveBeenCalled()
      // 最後のswitchPreset呼び出しが'rain'（復帰）
      expect(audioCtl.presetHistory[audioCtl.presetHistory.length - 1]).toBe('rain')
    })

    it('PhaseCompleted(long-break) → BGM停止 + 環境音復帰', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'long-break',
        timestamp: Date.now()
      })

      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'long-break',
        timestamp: Date.now()
      })

      expect(sfx.stop).toHaveBeenCalled()
      expect(audioCtl.presetHistory[audioCtl.presetHistory.length - 1]).toBe('rain')
    })

    it('TimerReset → BGM停止 + 環境音復帰', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      // break開始
      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })

      // リセット
      bus.publish<TimerEvent>('TimerReset', { type: 'TimerReset' })

      expect(sfx.stop).toHaveBeenCalled()
      expect(audioCtl.presetHistory[audioCtl.presetHistory.length - 1]).toBe('rain')
    })

    it('TimerPaused → BGM停止', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })

      bus.publish<TimerEvent>('TimerPaused', {
        type: 'TimerPaused',
        elapsedMs: 5000
      })

      expect(sfx.stop).toHaveBeenCalled()
    })

    it('PhaseStarted(work) → BGMを再生しない', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'work',
        timestamp: Date.now()
      })

      expect(sfx.playLoop).not.toHaveBeenCalled()
    })

    it('TriggerFired(無関係ID) → 何もしない', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<TimerEvent>('TriggerFired', {
        type: 'TriggerFired',
        triggerId: 'some-other-trigger',
        phase: 'work',
        timestamp: Date.now()
      })

      expect(sfx.stop).not.toHaveBeenCalled()
      expect(sfx.playLoop).not.toHaveBeenCalled()
    })

    it('audioControl未指定 → エラーなし（後方互換）', () => {
      bridgeTimerToSfx(bus, sfx)

      expect(() => {
        bus.publish<TimerEvent>('PhaseStarted', {
          type: 'PhaseStarted',
          phase: 'break',
          timestamp: Date.now()
        })
      }).not.toThrow()
    })

    it('カスタムURL指定 → 反映される', () => {
      bridgeTimerToSfx(bus, sfx, {
        breakChillUrl: '/audio/custom-chill.mp3',
        breakGetsetUrl: '/audio/custom-getset.mp3'
      }, audioCtl)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.playLoop).toHaveBeenCalledWith('/audio/custom-chill.mp3', 3000, 1.0)

      bus.publish<TimerEvent>('TriggerFired', {
        type: 'TriggerFired',
        triggerId: 'break-getset',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.playLoop).toHaveBeenCalledWith('/audio/custom-getset.mp3', 3000, 1.0)
    })

    it('PomodoroAborted → exit音を再生する', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<PomodoroEvent>('PomodoroAborted', {
        type: 'PomodoroAborted',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledWith('./audio/pomodoro-exit.mp3', 1.0)
    })

    it('PomodoroCompleted → exit音を再生しない', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<PomodoroEvent>('PomodoroCompleted', {
        type: 'PomodoroCompleted',
        timestamp: Date.now()
      })

      expect(sfx.play).not.toHaveBeenCalledWith('./audio/pomodoro-exit.mp3', expect.anything())
    })

    it('TimerReset → exit音を再生しない（BGM停止+環境音復帰のみ）', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })
      sfx.playCalls.length = 0

      bus.publish<TimerEvent>('TimerReset', { type: 'TimerReset' })

      expect(sfx.playCalls).not.toContain('./audio/pomodoro-exit.mp3')
    })

    it('shouldPlayAudio未指定 → 後方互換で全て再生される', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'work',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledWith('./audio/work-start.mp3', 1.0)
    })

    it('shouldPlayAudio=false → SFX/BGMを再生しない', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl, () => false)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'work',
        timestamp: Date.now()
      })
      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now()
      })
      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.play).not.toHaveBeenCalled()
      expect(sfx.playLoop).not.toHaveBeenCalled()
      expect(audioCtl.presetHistory).not.toContain('silence')
    })

    it('shouldPlayAudio=false → TriggerFiredでもBGM切替しない', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl, () => false)

      bus.publish<TimerEvent>('TriggerFired', {
        type: 'TriggerFired',
        triggerId: 'break-getset',
        phase: 'break',
        timestamp: Date.now()
      })

      expect(sfx.playLoop).not.toHaveBeenCalled()
    })

    it('shouldPlayAudio=false → PomodoroAbortedでもexit音を再生しない', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl, () => false)

      bus.publish<PomodoroEvent>('PomodoroAborted', {
        type: 'PomodoroAborted',
        timestamp: Date.now()
      })

      expect(sfx.play).not.toHaveBeenCalled()
    })

    it('shouldPlayAudio=false → 停止系(restorePreset)は常に実行される', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl, () => false)

      bus.publish<TimerEvent>('TimerReset', { type: 'TimerReset' })

      expect(sfx.stop).toHaveBeenCalled()
    })

    it('shouldPlayAudio=true → SFX再生する', () => {
      bridgeTimerToSfx(bus, sfx, {}, audioCtl, () => true)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'work',
        timestamp: Date.now()
      })

      expect(sfx.play).toHaveBeenCalledWith('./audio/work-start.mp3', 1.0)
    })

    it('カスタムgain指定 → 各再生に反映される', () => {
      bridgeTimerToSfx(bus, sfx, {
        workStartGain: 0.6,
        workCompleteGain: 0.5,
        fanfareGain: 0.7,
        breakChillGain: 0.3,
        breakGetsetGain: 0.4
      }, audioCtl)

      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'work',
        timestamp: Date.now()
      })
      expect(sfx.play).toHaveBeenCalledWith('./audio/work-start.mp3', 0.6)

      // work→break経路でwork-completeのgainを検証
      bus.publish<TimerEvent>('PhaseCompleted', {
        type: 'PhaseCompleted',
        phase: 'work',
        timestamp: Date.now()
      })
      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'break',
        timestamp: Date.now()
      })
      expect(sfx.play).toHaveBeenCalledWith('./audio/work-complete.mp3', 0.5)
      expect(sfx.playLoop).toHaveBeenCalledWith('./audio/break-chill.mp3', 3000, 0.3)

      // congrats経路でfanfareのgainを検証
      bus.publish<TimerEvent>('PhaseStarted', {
        type: 'PhaseStarted',
        phase: 'congrats',
        timestamp: Date.now()
      })
      expect(sfx.play).toHaveBeenCalledWith('./audio/fanfare.mp3', 0.7)

      bus.publish<TimerEvent>('TriggerFired', {
        type: 'TriggerFired',
        triggerId: 'break-getset',
        phase: 'break',
        timestamp: Date.now()
      })
      expect(sfx.playLoop).toHaveBeenCalledWith('./audio/break-getset.mp3', 3000, 0.4)
    })
  })
})
