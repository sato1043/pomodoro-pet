import { describe, it, expect, beforeEach } from 'vitest'
import { createPomodoroSession, PomodoroSession } from '../../../src/domain/timer/entities/PomodoroSession'
import { createConfig } from '../../../src/domain/timer/value-objects/TimerConfig'
import type { TimerEvent } from '../../../src/domain/timer/events/TimerEvents'

describe('PomodoroSession', () => {
  let session: PomodoroSession

  // テスト用に短い設定: 作業3秒、休憩2秒
  const testConfig = createConfig(3000, 2000)

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
    it('作業→休憩の1サイクル完了でカウントが増える', () => {
      session.start()
      expect(session.completedCycles).toBe(0)
      session.tick(3000) // 作業完了
      session.tick(2000) // 休憩完了
      expect(session.completedCycles).toBe(1)
    })
  })
})
