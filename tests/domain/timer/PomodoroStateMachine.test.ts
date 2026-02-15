import { describe, it, expect, beforeEach } from 'vitest'
import { createPomodoroStateMachine, PomodoroStateMachine } from '../../../src/domain/timer/entities/PomodoroStateMachine'
import { createConfig } from '../../../src/domain/timer/value-objects/TimerConfig'
import { CONGRATS_DURATION_MS } from '../../../src/domain/timer/value-objects/CyclePlan'
import type { TimerEvent } from '../../../src/domain/timer/events/TimerEvents'

describe('PomodoroStateMachine', () => {
  let session: PomodoroStateMachine

  // テスト用に短い設定: 作業3秒、休憩2秒、長時間休憩4秒、4セット
  // CyclePlan: [work,break, work,break, work,break, work,congrats,long-break]
  const testConfig = createConfig(3000, 2000, 4000, 4)

  // セットを1つ消化するヘルパー（work + break）— 非最終セット用
  function consumeOneSet(s: PomodoroStateMachine): void {
    s.tick(3000) // work完了 → break開始
    s.tick(2000) // break完了 → 次set work開始
  }

  beforeEach(() => {
    session = createPomodoroStateMachine(testConfig)
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

    it('congrats中にpauseしても何もしない', () => {
      session.start()
      consumeOneSet(session) // set1
      consumeOneSet(session) // set2
      consumeOneSet(session) // set3
      session.tick(3000)     // set4 work完了 → congrats開始
      expect(session.currentPhase.type).toBe('congrats')
      expect(session.isRunning).toBe(true)
      const events = session.pause()
      expect(events).toHaveLength(0)
      expect(session.isRunning).toBe(true)
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

    it('congrats中にresetするとworkに戻る', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000) // set4 work完了 → congrats
      expect(session.currentPhase.type).toBe('congrats')
      const events = session.reset()
      expect(session.currentPhase.type).toBe('work')
      expect(session.isRunning).toBe(false)
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

    it('4セット work → congrats → long-break完了で1サイクル完了になる', () => {
      session.start()
      consumeOneSet(session) // set1
      consumeOneSet(session) // set2
      consumeOneSet(session) // set3
      session.tick(3000)     // set4 work完了 → congrats開始
      session.tick(CONGRATS_DURATION_MS) // congrats完了 → long-break開始
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
      session.tick(CONGRATS_DURATION_MS)
      session.tick(4000) // long-break完了
      // 1サイクル完了で自動停止するため再開
      session.start()
      // 2サイクル目
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000)
      session.tick(CONGRATS_DURATION_MS)
      session.tick(4000) // long-break完了
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

  describe('最終セット: work → congrats → long-break', () => {
    it('set4のwork完了後はcongratsになる', () => {
      session.start()
      consumeOneSet(session) // set1
      consumeOneSet(session) // set2
      consumeOneSet(session) // set3
      const events = session.tick(3000) // set4 work完了
      expect(session.currentPhase.type).toBe('congrats')
      expect(session.currentPhase.durationMs).toBe(CONGRATS_DURATION_MS)
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseStarted', phase: 'congrats' })
      )
    })

    it('congrats完了後にlong-breakフェーズに遷移する', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000) // set4 work完了 → congrats
      const events = session.tick(CONGRATS_DURATION_MS) // congrats完了
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseCompleted', phase: 'congrats' })
      )
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseStarted', phase: 'long-break' })
      )
      expect(session.currentPhase.type).toBe('long-break')
      expect(session.currentPhase.durationMs).toBe(4000)
      expect(session.isRunning).toBe(true)
    })

    it('long-break完了後にCycleCompletedとSetCompletedが発火する', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000) // set4 work完了 → congrats
      session.tick(CONGRATS_DURATION_MS) // congrats完了 → long-break
      const events = session.tick(4000) // long-break完了
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseCompleted', phase: 'long-break' })
      )
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'SetCompleted', setNumber: 4, totalSets: 4 })
      )
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'CycleCompleted', cycleNumber: 1 })
      )
    })

    it('long-break完了後にisRunning=falseになる', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000)
      session.tick(CONGRATS_DURATION_MS)
      session.tick(4000) // long-break完了
      expect(session.isRunning).toBe(false)
    })

    it('long-break完了後にset1のworkに戻る', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000)
      session.tick(CONGRATS_DURATION_MS)
      session.tick(4000) // long-break完了
      expect(session.currentSet).toBe(1)
      expect(session.completedSets).toBe(0)
      expect(session.completedCycles).toBe(1)
      expect(session.currentPhase.type).toBe('work')
    })
  })

  describe('congrats', () => {
    it('congratsフェーズの残り時間がCONGRATS_DURATION_MSである', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000) // set4 work完了 → congrats
      expect(session.currentPhase.type).toBe('congrats')
      expect(session.currentPhase.durationMs).toBe(CONGRATS_DURATION_MS)
      expect(session.remainingMs).toBe(CONGRATS_DURATION_MS)
    })

    it('congratsでSetCompletedは発火しない', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000) // set4 work完了 → congrats
      const events = session.tick(CONGRATS_DURATION_MS) // congrats完了
      const setCompletedEvents = events.filter(e => e.type === 'SetCompleted')
      expect(setCompletedEvents).toHaveLength(0)
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
    // CyclePlan: [work, congrats, break]
    it('set1のwork完了後はcongratsになる', () => {
      const singleSetConfig = createConfig(3000, 2000, 4000, 1)
      const s = createPomodoroStateMachine(singleSetConfig)
      s.start()
      s.tick(3000) // work完了 → congrats
      expect(s.currentPhase.type).toBe('congrats')
      expect(s.currentPhase.durationMs).toBe(CONGRATS_DURATION_MS)
    })

    it('congrats完了後にbreakに遷移する', () => {
      const singleSetConfig = createConfig(3000, 2000, 4000, 1)
      const s = createPomodoroStateMachine(singleSetConfig)
      s.start()
      s.tick(3000) // work完了 → congrats
      const events = s.tick(CONGRATS_DURATION_MS) // congrats完了 → break
      expect(s.currentPhase.type).toBe('break')
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'PhaseStarted', phase: 'break' })
      )
    })

    it('break完了でサイクル完了する', () => {
      const singleSetConfig = createConfig(3000, 2000, 4000, 1)
      const s = createPomodoroStateMachine(singleSetConfig)
      s.start()
      s.tick(3000)                // work完了 → congrats
      s.tick(CONGRATS_DURATION_MS) // congrats完了 → break
      const events = s.tick(2000) // break完了
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'CycleCompleted', cycleNumber: 1 })
      )
      expect(s.isRunning).toBe(false)
    })
  })

  describe('state', () => {
    it('初期状態はwork/running=falseである', () => {
      expect(session.state).toEqual({ phase: 'work', running: false })
    })

    it('start後はwork/running=trueになる', () => {
      session.start()
      expect(session.state).toEqual({ phase: 'work', running: true })
    })

    it('pause後はwork/running=falseになる', () => {
      session.start()
      session.tick(1000)
      session.pause()
      expect(session.state).toEqual({ phase: 'work', running: false })
    })

    it('break中はbreak/running=trueになる', () => {
      session.start()
      session.tick(3000) // work完了 → break開始
      expect(session.state).toEqual({ phase: 'break', running: true })
    })

    it('long-break中はlong-break/running=trueになる', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000) // set4 work完了 → congrats
      session.tick(CONGRATS_DURATION_MS) // congrats完了 → long-break
      expect(session.state).toEqual({ phase: 'long-break', running: true })
    })

    it('congrats中はrunningプロパティを持たない', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000) // set4 work完了 → congrats
      expect(session.state).toEqual({ phase: 'congrats' })
      expect('running' in session.state).toBe(false)
    })
  })

  describe('exitManually', () => {
    it('work中にexitManuallyするとTimerResetイベントを返す', () => {
      session.start()
      session.tick(1000)
      const events = session.exitManually()
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'TimerReset' })
      )
      expect(session.isRunning).toBe(false)
      expect(session.currentPhase.type).toBe('work')
      expect(session.elapsedMs).toBe(0)
    })

    it('congrats中にexitManuallyしても何もしない', () => {
      session.start()
      consumeOneSet(session)
      consumeOneSet(session)
      consumeOneSet(session)
      session.tick(3000) // set4 work完了 → congrats
      expect(session.currentPhase.type).toBe('congrats')
      const events = session.exitManually()
      expect(events).toHaveLength(0)
      expect(session.currentPhase.type).toBe('congrats')
      expect(session.isRunning).toBe(true)
    })

    it('停止中にexitManuallyしても何もしない', () => {
      const events = session.exitManually()
      expect(events).toHaveLength(0)
    })

    it('break中にexitManuallyするとリセットされる', () => {
      session.start()
      session.tick(3000) // work完了 → break開始
      expect(session.currentPhase.type).toBe('break')
      const events = session.exitManually()
      expect(events).toContainEqual(
        expect.objectContaining({ type: 'TimerReset' })
      )
      expect(session.currentPhase.type).toBe('work')
      expect(session.isRunning).toBe(false)
    })
  })

  describe('PhaseTimeTrigger', () => {
    it('elapsed トリガーが指定時間で発火する', () => {
      const s = createPomodoroStateMachine(testConfig, {
        phaseTriggers: {
          work: [{ id: 'work-mid', timing: { type: 'elapsed', afterMs: 1500 } }]
        }
      })
      s.start()

      // 1000ms時点では未発火
      let events = s.tick(1000)
      expect(events.find(e => e.type === 'TriggerFired')).toBeUndefined()

      // 1500ms到達で発火
      events = s.tick(500)
      const trigger = events.find(e => e.type === 'TriggerFired')
      expect(trigger).toBeDefined()
      expect(trigger).toMatchObject({
        type: 'TriggerFired',
        triggerId: 'work-mid',
        phase: 'work'
      })
    })

    it('remaining トリガーが残り時間で発火する', () => {
      const s = createPomodoroStateMachine(testConfig, {
        phaseTriggers: {
          work: [{ id: 'work-ending', timing: { type: 'remaining', beforeEndMs: 1000 } }]
        }
      })
      s.start()

      // 残り1500ms（elapsed=1500）では未発火
      let events = s.tick(1500)
      expect(events.find(e => e.type === 'TriggerFired')).toBeUndefined()

      // 残り1000ms（elapsed=2000）で発火
      events = s.tick(500)
      const trigger = events.find(e => e.type === 'TriggerFired')
      expect(trigger).toBeDefined()
      expect(trigger).toMatchObject({
        type: 'TriggerFired',
        triggerId: 'work-ending',
        phase: 'work'
      })
    })

    it('同一フェーズ内で重複発火しない', () => {
      const s = createPomodoroStateMachine(testConfig, {
        phaseTriggers: {
          work: [{ id: 'once', timing: { type: 'elapsed', afterMs: 1000 } }]
        }
      })
      s.start()

      s.tick(1500) // 発火
      const events = s.tick(500) // 2回目のtick
      expect(events.filter(e => e.type === 'TriggerFired')).toHaveLength(0)
    })

    it('フェーズ切替でリセットされ再発火可能になる', () => {
      // work(3s) → break(2s) → work(3s) のサイクルでworkにトリガーを設定
      const s = createPomodoroStateMachine(testConfig, {
        phaseTriggers: {
          work: [{ id: 'work-start', timing: { type: 'elapsed', afterMs: 500 } }]
        }
      })
      s.start()

      // set1 workで発火
      let events = s.tick(1000)
      expect(events.filter(e => e.type === 'TriggerFired')).toHaveLength(1)

      // work完了 → break → 次のwork
      s.tick(2000) // work完了
      s.tick(2000) // break完了 → set2 work開始

      // set2 workで再度発火
      events = s.tick(1000)
      expect(events.filter(e => e.type === 'TriggerFired')).toHaveLength(1)
      expect(events.find(e => e.type === 'TriggerFired')).toMatchObject({
        triggerId: 'work-start',
        phase: 'work'
      })
    })

    it('複数トリガーが1 tickで同時発火する', () => {
      const s = createPomodoroStateMachine(testConfig, {
        phaseTriggers: {
          work: [
            { id: 'trigger-a', timing: { type: 'elapsed', afterMs: 1000 } },
            { id: 'trigger-b', timing: { type: 'elapsed', afterMs: 1500 } }
          ]
        }
      })
      s.start()

      // 2000ms tickで両方発火
      const events = s.tick(2000)
      const triggers = events.filter(e => e.type === 'TriggerFired')
      expect(triggers).toHaveLength(2)
      expect(triggers.map(t => 'triggerId' in t ? t.triggerId : '')).toContain('trigger-a')
      expect(triggers.map(t => 'triggerId' in t ? t.triggerId : '')).toContain('trigger-b')
    })

    it('トリガー未指定時は既存動作に影響なし', () => {
      const s = createPomodoroStateMachine(testConfig)
      s.start()
      const events = s.tick(1500)
      expect(events.filter(e => e.type === 'TriggerFired')).toHaveLength(0)
      expect(events.find(e => e.type === 'TimerTicked')).toBeDefined()
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
