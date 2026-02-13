import { describe, it, expect, beforeEach } from 'vitest'
import { createPomodoroSession, PomodoroSession } from '../../../src/domain/timer/entities/PomodoroSession'
import { createConfig } from '../../../src/domain/timer/value-objects/TimerConfig'
import type { TimerEvent } from '../../../src/domain/timer/events/TimerEvents'

describe('PomodoroSession', () => {
  let session: PomodoroSession

  // テスト用に短い設定: 作業3秒、休憩2秒、長時間休憩4秒、4セット
  const testConfig = createConfig(3000, 2000, 4000, 4)

  // セットを1つ消化するヘルパー（work + break）
  function consumeOneSet(s: PomodoroSession): void {
    s.tick(3000) // work完了 → break開始
    s.tick(2000) // break完了 → 次set work開始
  }

  beforeEach(() => {
    session = createPomodoroSession(testConfig)
  })

  describe('初期状態', () => {
    it('作業フェーズで停止状態である', () => {
      expect(session.currentPhase.type).toBe('work')
      expect(session.isRunning).toBe(false)
      expect(session.elapsedMs).toBe(0)
    })

    it('残り時間が作業時間と一致する', () => {
      expect(session.remainingMs).toBe(3000)
    })
  })

  describe('start', () => {
    it('タイマーが動作状態になる', () => {
      const events = session.start()
      expect(session.isRunning).toBe(true)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseStarted', phase: 'work' })
      )
    })

    it('既に動作中なら何もしない', () => {
      session.start()
      const events = session.start()
      expect(events).toHaveLength(0)
    })
  })

  describe('tick', () => {
    it('動作中に経過時間が増加する', () => {
      session.start()
      const events = session.tick(1000)
      expect(session.elapsedMs).toBe(1000)
      expect(session.remainingMs).toBe(2000)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'TimerTicked', remainingMs: 2000 })
      )
    })

    it('停止中はtickしても変化しない', () => {
      const events = session.tick(1000)
      expect(session.elapsedMs).toBe(0)
      expect(events).toHaveLength(0)
    })

    it('作業時間を超過するとPhaseCompletedが発生し休憩に遷移する', () => {
      session.start()
      session.tick(2000)
      const events = session.tick(1500)

      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseCompleted', phase: 'work' })
      )
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseStarted', phase: 'break' })
      )
      expect(session.currentPhase.type).toBe('break')
      expect(session.isRunning).toBe(true)
    })

    it('休憩時間を超過すると作業フェーズに戻る', () => {
      session.start()
      // 作業3秒消化
      session.tick(3000)
      // 休憩2秒消化
      const events = session.tick(2500)

      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseCompleted', phase: 'break' })
      )
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseStarted', phase: 'work' })
      )
      expect(session.currentPhase.type).toBe('work')
    })
  })

  describe('pause', () => {
    it('動作中を一時停止できる', () => {
      session.start()
      session.tick(1000)
      const events = session.pause()
      expect(session.isRunning).toBe(false)
      expect(session.elapsedMs).toBe(1000)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'TimerPaused', elapsedMs: 1000 })
      )
    })

    it('停止中にpauseしても何もしない', () => {
      const events = session.pause()
      expect(events).toHaveLength(0)
    })
  })

  describe('resume（pauseからの再開）', () => {
    it('一時停止から再開できる', () => {
      session.start()
      session.tick(1000)
      session.pause()
      const events = session.start()
      expect(session.isRunning).toBe(true)
      expect(session.elapsedMs).toBe(1000)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseStarted', phase: 'work' })
      )
    })
  })

  describe('reset', () => {
    it('タイマーを初期状態に戻す', () => {
      session.start()
      session.tick(2000)
      const events = session.reset()
      expect(session.isRunning).toBe(false)
      expect(session.elapsedMs).toBe(0)
      expect(session.currentPhase.type).toBe('work')
      expect(session.remainingMs).toBe(3000)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'TimerReset' })
      )
    })
  })

  describe('completedCycles', () => {
    it('1セット完了ではサイクルカウントは増えない', () => {
      session.start()
      expect(session.completedCycles).toBe(0)
      session.tick(3000) // set1 work完了
      session.tick(2000) // set1 break完了
      expect(session.completedCycles).toBe(0)
    })

    it('4セット+long-break完了で1サイクル完了になる', () => {
      session.start()
      consumeOneSet(session) // set1
      consumeOneSet(session) // set2
      consumeOneSet(session) // set3
      session.tick(3000)     // set4 work完了 → long-break開始
      session.tick(4000)     // long-break完了
      expect(session.completedCycles).toBe(1)
    })

    it('2サイクル完了でcompletedCyclesが2になる', () => {
      session.start()
      // 1サイクル目
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000)
      session.tick(4000)
      // 1サイクル完了で自動停止するため再開
      session.start()
      // 2サイクル目
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000)
      session.tick(4000)
      expect(session.completedCycles).toBe(2)
    })
  })

  describe('セット構造の初期状態', () => {
    it('currentSetが1である', () => {
      expect(session.currentSet).toBe(1)
    })

    it('totalSetsが4である', () => {
      expect(session.totalSets).toBe(4)
    })

    it('completedSetsが0である', () => {
      expect(session.completedSets).toBe(0)
    })
  })

  describe('セット進行', () => {
    it('set1完了後にcurrentSetが2になる', () => {
      session.start()
      consumeOneSet(session)
      expect(session.currentSet).toBe(2)
      expect(session.completedSets).toBe(1)
      expect(session.currentPhase.type).toBe('work')
    })

    it('set1のwork完了後はshort breakになる', () => {
      session.start()
      const events = session.tick(3000)
      expect(session.currentPhase.type).toBe('break')
      expect(session.currentPhase.durationMs).toBe(2000)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseStarted', phase: 'break' })
      )
    })

    it('set1のbreak完了時にSetCompletedイベントが発生する', () => {
      session.start()
      session.tick(3000)
      const events = session.tick(2000)
      expect(events).toContainEqual(
        expect.objectContaining({
          type: 'SetCompleted',
          setNumber: 1,
          totalSets: 4
        })
      )
    })
  })

  describe('long-break', () => {
    it('set4のwork完了後はlong-breakになる', () => {
      session.start()
      consumeOneSet(session) // set1
      consumeOneSet(session) // set2
      consumeOneSet(session) // set3
      const events = session.tick(3000) // set4 work完了
      expect(session.currentPhase.type).toBe('long-break')
      expect(session.currentPhase.durationMs).toBe(4000)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseStarted', phase: 'long-break' })
      )
    })

    it('long-break完了後にCycleCompletedイベントが発生する', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000) // set4 work完了
      const events = session.tick(4000) // long-break完了
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'CycleCompleted', cycleNumber: 1 })
      )
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'SetCompleted', setNumber: 4, totalSets: 4 })
      )
    })

    it('long-break完了後にset1のworkに戻りタイマーが停止する', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000) // set4 work完了
      session.tick(4000) // long-break完了
      expect(session.currentSet).toBe(1)
      expect(session.completedSets).toBe(0)
      expect(session.completedCycles).toBe(1)
      expect(session.currentPhase.type).toBe('work')
      expect(session.isRunning).toBe(false)
    })
  })

  describe('resetとセット情報', () => {
    it('リセットでセット情報も初期化される', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      session.reset()
      expect(session.currentSet).toBe(1)
      expect(session.completedSets).toBe(0)
      expect(session.completedCycles).toBe(0)
      expect(session.currentPhase.type).toBe('work')
    })
  })

  describe('setsPerCycle=1のエッジケース', () => {
    it('set1のwork完了後はbreakになる（Long Breakなし）', () => {
      const singleSetConfig = createConfig(3000, 2000, 4000, 1)
      const s = createPomodoroSession(singleSetConfig)
      s.start()
      s.tick(3000)
      expect(s.currentPhase.type).toBe('break')
      expect(s.currentPhase.durationMs).toBe(2000)
    })
  })

  describe('TimerConfig バリデーション', () => {
    it('longBreakDurationMsが0以下ならエラー', () => {
      expect(() => createConfig(3000, 2000, 0, 4)).toThrow()
    })

    it('setsPerCycleが0以下ならエラー', () => {
      expect(() => createConfig(3000, 2000, 4000, 0)).toThrow()
    })

    it('setsPerCycleが小数ならエラー', () => {
      expect(() => createConfig(3000, 2000, 4000, 2.5)).toThrow()
    })
  })
})
