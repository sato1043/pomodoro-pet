import { describe, it, expect } from 'vitest'
import {
  createDefaultEmotionHistoryData,
  createEmptyDailyRecord,
  recordEmotionEvent,
  updateLastSession,
  updateDailySnapshot,
  updateStreak,
  calculateCrossSessionEffect,
  applyCrossSessionChanges,
  CROSS_SESSION,
} from '../../../src/domain/character/value-objects/EmotionHistory'

describe('EmotionHistory', () => {
  describe('createDefaultEmotionHistoryData', () => {
    it('デフォルト値を返す', () => {
      const data = createDefaultEmotionHistoryData()
      expect(data.lastSession).toEqual({ satisfaction: 0.5, fatigue: 0, affinity: 0, timestamp: 0 })
      expect(data.daily).toEqual({})
      expect(data.streakDays).toBe(0)
      expect(data.lastActiveDate).toBe('')
    })
  })

  describe('createEmptyDailyRecord', () => {
    it('空の日次レコードを返す', () => {
      const record = createEmptyDailyRecord()
      expect(record.snapshot).toEqual({ satisfaction: 0.5, fatigue: 0, affinity: 0 })
      expect(record.events).toEqual({ pomodoroCompleted: 0, pomodoroAborted: 0, fed: 0, petted: 0 })
      expect(record.lastPomodoroAt).toBeNull()
      expect(record.lastFeedingAt).toBeNull()
    })
  })

  describe('recordEmotionEvent', () => {
    it('pomodoroCompleted カウントを加算する', () => {
      const data = createDefaultEmotionHistoryData()
      const result = recordEmotionEvent(data, '2026-03-03', 'pomodoroCompleted')
      expect(result.daily['2026-03-03'].events.pomodoroCompleted).toBe(1)
      expect(result.daily['2026-03-03'].lastPomodoroAt).not.toBeNull()
    })

    it('pomodoroAborted カウントを加算する', () => {
      const data = createDefaultEmotionHistoryData()
      const result = recordEmotionEvent(data, '2026-03-03', 'pomodoroAborted')
      expect(result.daily['2026-03-03'].events.pomodoroAborted).toBe(1)
      expect(result.daily['2026-03-03'].lastPomodoroAt).not.toBeNull()
    })

    it('fed カウントを加算し lastFeedingAt を更新する', () => {
      const data = createDefaultEmotionHistoryData()
      const result = recordEmotionEvent(data, '2026-03-03', 'fed')
      expect(result.daily['2026-03-03'].events.fed).toBe(1)
      expect(result.daily['2026-03-03'].lastFeedingAt).not.toBeNull()
      expect(result.daily['2026-03-03'].lastPomodoroAt).toBeNull()
    })

    it('petted カウントを加算する', () => {
      const data = createDefaultEmotionHistoryData()
      const result = recordEmotionEvent(data, '2026-03-03', 'petted')
      expect(result.daily['2026-03-03'].events.petted).toBe(1)
    })

    it('複数回のイベントを累積する', () => {
      let data = createDefaultEmotionHistoryData()
      data = recordEmotionEvent(data, '2026-03-03', 'pomodoroCompleted')
      data = recordEmotionEvent(data, '2026-03-03', 'pomodoroCompleted')
      data = recordEmotionEvent(data, '2026-03-03', 'fed')
      expect(data.daily['2026-03-03'].events.pomodoroCompleted).toBe(2)
      expect(data.daily['2026-03-03'].events.fed).toBe(1)
    })

    it('異なる日付のイベントは分離される', () => {
      let data = createDefaultEmotionHistoryData()
      data = recordEmotionEvent(data, '2026-03-03', 'pomodoroCompleted')
      data = recordEmotionEvent(data, '2026-03-04', 'pomodoroCompleted')
      expect(data.daily['2026-03-03'].events.pomodoroCompleted).toBe(1)
      expect(data.daily['2026-03-04'].events.pomodoroCompleted).toBe(1)
    })

    it('元のデータを変更しない（イミュータブル）', () => {
      const data = createDefaultEmotionHistoryData()
      const result = recordEmotionEvent(data, '2026-03-03', 'pomodoroCompleted')
      expect(data.daily['2026-03-03']).toBeUndefined()
      expect(result.daily['2026-03-03'].events.pomodoroCompleted).toBe(1)
    })
  })

  describe('updateLastSession', () => {
    it('lastSession を正しく更新する', () => {
      const data = createDefaultEmotionHistoryData()
      const state = { satisfaction: 0.7, fatigue: 0.3, affinity: 0.5 }
      const result = updateLastSession(data, state, 1000000)
      expect(result.lastSession).toEqual({ satisfaction: 0.7, fatigue: 0.3, affinity: 0.5, timestamp: 1000000 })
    })

    it('元のデータを変更しない（イミュータブル）', () => {
      const data = createDefaultEmotionHistoryData()
      const state = { satisfaction: 0.7, fatigue: 0.3, affinity: 0.5 }
      updateLastSession(data, state, 1000000)
      expect(data.lastSession.satisfaction).toBe(0.5)
    })
  })

  describe('updateDailySnapshot', () => {
    it('日次スナップショットを正しく更新する', () => {
      const data = createDefaultEmotionHistoryData()
      const state = { satisfaction: 0.8, fatigue: 0.2, affinity: 0.6 }
      const result = updateDailySnapshot(data, '2026-03-03', state)
      expect(result.daily['2026-03-03'].snapshot).toEqual(state)
    })

    it('既存のイベントカウントを保持する', () => {
      let data = createDefaultEmotionHistoryData()
      data = recordEmotionEvent(data, '2026-03-03', 'pomodoroCompleted')
      const state = { satisfaction: 0.8, fatigue: 0.2, affinity: 0.6 }
      const result = updateDailySnapshot(data, '2026-03-03', state)
      expect(result.daily['2026-03-03'].events.pomodoroCompleted).toBe(1)
      expect(result.daily['2026-03-03'].snapshot).toEqual(state)
    })

    it('日次レコードが存在しない場合は新規作成する', () => {
      const data = createDefaultEmotionHistoryData()
      const state = { satisfaction: 0.8, fatigue: 0.2, affinity: 0.6 }
      const result = updateDailySnapshot(data, '2026-03-03', state)
      expect(result.daily['2026-03-03'].events.pomodoroCompleted).toBe(0)
    })
  })

  describe('updateStreak', () => {
    it('初回利用: streakDays=1 になる', () => {
      const data = createDefaultEmotionHistoryData()
      const result = updateStreak(data, '2026-03-03')
      expect(result.streakDays).toBe(1)
      expect(result.lastActiveDate).toBe('2026-03-03')
    })

    it('同日の呼び出し: 変更なし', () => {
      let data = createDefaultEmotionHistoryData()
      data = updateStreak(data, '2026-03-03')
      const result = updateStreak(data, '2026-03-03')
      expect(result.streakDays).toBe(1)
      expect(result).toBe(data) // 同一参照
    })

    it('連続日: streakDays が加算される', () => {
      let data = createDefaultEmotionHistoryData()
      data = updateStreak(data, '2026-03-01')
      data = updateStreak(data, '2026-03-02')
      data = updateStreak(data, '2026-03-03')
      expect(data.streakDays).toBe(3)
      expect(data.lastActiveDate).toBe('2026-03-03')
    })

    it('2日以上空くと streak がリセットされる', () => {
      let data = createDefaultEmotionHistoryData()
      data = updateStreak(data, '2026-03-01')
      data = updateStreak(data, '2026-03-02')
      data = updateStreak(data, '2026-03-05') // 2日空き
      expect(data.streakDays).toBe(1)
      expect(data.lastActiveDate).toBe('2026-03-05')
    })

    it('1日空きでリセットされる（連続は前日のみ）', () => {
      let data = createDefaultEmotionHistoryData()
      data = updateStreak(data, '2026-03-01')
      data = updateStreak(data, '2026-03-03') // 1日空き
      expect(data.streakDays).toBe(1)
    })
  })

  describe('calculateCrossSessionEffect', () => {
    it('5分未満の経過は全デルタ0', () => {
      const effect = calculateCrossSessionEffect(4 * 60 * 1000, 0)
      expect(effect.satisfactionDelta).toBe(0)
      expect(effect.fatigueDelta).toBe(0)
      expect(effect.affinityDelta).toBe(0)
    })

    it('1時間放置でsatisfactionが-0.02', () => {
      const effect = calculateCrossSessionEffect(1 * 60 * 60 * 1000, 0)
      expect(effect.satisfactionDelta).toBeCloseTo(-0.02, 5)
    })

    it('8時間放置でsatisfaction -0.16, fatigue -0.40', () => {
      const effect = calculateCrossSessionEffect(8 * 60 * 60 * 1000, 0)
      expect(effect.satisfactionDelta).toBeCloseTo(-0.16, 5)
      expect(effect.fatigueDelta).toBeCloseTo(-0.40, 5)
    })

    it('satisfaction減衰が-0.30でキャップされる', () => {
      // 15時間で -0.02*15 = -0.30 に到達するので24時間でもキャップ
      const effect = calculateCrossSessionEffect(24 * 60 * 60 * 1000, 0)
      expect(effect.satisfactionDelta).toBe(CROSS_SESSION.SATISFACTION_DECAY_CAP)
    })

    it('fatigue回復が無制限（適用時にクランプ）', () => {
      const effect = calculateCrossSessionEffect(24 * 60 * 60 * 1000, 0)
      expect(effect.fatigueDelta).toBeCloseTo(-1.2, 5)
    })

    it('4時間以内のaffinityは減衰しない', () => {
      const effect = calculateCrossSessionEffect(3 * 60 * 60 * 1000, 0)
      expect(effect.affinityDelta).toBe(0)
    })

    it('8時間放置でaffinityがわずかに減衰（猶予4h後の4h分）', () => {
      const effect = calculateCrossSessionEffect(8 * 60 * 60 * 1000, 0)
      // effectiveHours = 8 - 4 = 4, effectiveDays = 4/24
      // affinityDecay = -0.03 * (4/24) ≈ -0.005
      expect(effect.affinityDelta).toBeCloseTo(-0.03 * (4 / 24), 5)
    })

    it('affinity減衰が-0.15でキャップされる', () => {
      // 十分に長い時間: 200時間放置
      const effect = calculateCrossSessionEffect(200 * 60 * 60 * 1000, 0)
      expect(effect.affinityDelta).toBe(CROSS_SESSION.AFFINITY_DECAY_CAP)
    })

    it('streakDays=3以上でボーナス', () => {
      // streakDays=5, elapsedMs=1h → 猶予内なのでdecay=0, bonus=0.01*(5-3+1)=0.03
      const effect = calculateCrossSessionEffect(1 * 60 * 60 * 1000, 5)
      expect(effect.affinityDelta).toBeCloseTo(0.03, 5)
    })

    it('streakボーナスが+0.10でキャップされる', () => {
      // streakDays=20 → bonus = min(0.10, 0.01*(20-3+1)) = min(0.10, 0.18) = 0.10
      const effect = calculateCrossSessionEffect(1 * 60 * 60 * 1000, 20)
      expect(effect.affinityDelta).toBeCloseTo(CROSS_SESSION.STREAK_BONUS_CAP, 5)
    })

    it('streakDays=2ではボーナスなし', () => {
      // streakDays=2 < threshold=3, elapsedMs=1h → 猶予内なのでdecay=0, bonus=0
      const effect = calculateCrossSessionEffect(1 * 60 * 60 * 1000, 2)
      expect(effect.affinityDelta).toBe(0)
    })
  })

  describe('applyCrossSessionChanges', () => {
    it('正のデルタを適用', () => {
      const state = { satisfaction: 0.5, fatigue: 0.5, affinity: 0.5 }
      const effect = { satisfactionDelta: 0.1, fatigueDelta: 0.1, affinityDelta: 0.1 }
      const result = applyCrossSessionChanges(state, effect)
      expect(result.satisfaction).toBeCloseTo(0.6, 5)
      expect(result.fatigue).toBeCloseTo(0.6, 5)
      expect(result.affinity).toBeCloseTo(0.6, 5)
    })

    it('負のデルタを適用', () => {
      const state = { satisfaction: 0.5, fatigue: 0.5, affinity: 0.5 }
      const effect = { satisfactionDelta: -0.2, fatigueDelta: -0.3, affinityDelta: -0.1 }
      const result = applyCrossSessionChanges(state, effect)
      expect(result.satisfaction).toBeCloseTo(0.3, 5)
      expect(result.fatigue).toBeCloseTo(0.2, 5)
      expect(result.affinity).toBeCloseTo(0.4, 5)
    })

    it('0未満にクランプ', () => {
      const state = { satisfaction: 0.1, fatigue: 0.1, affinity: 0.1 }
      const effect = { satisfactionDelta: -0.5, fatigueDelta: -0.5, affinityDelta: -0.5 }
      const result = applyCrossSessionChanges(state, effect)
      expect(result.satisfaction).toBe(0)
      expect(result.fatigue).toBe(0)
      expect(result.affinity).toBe(0)
    })

    it('1超にクランプ', () => {
      const state = { satisfaction: 0.9, fatigue: 0.9, affinity: 0.9 }
      const effect = { satisfactionDelta: 0.5, fatigueDelta: 0.5, affinityDelta: 0.5 }
      const result = applyCrossSessionChanges(state, effect)
      expect(result.satisfaction).toBe(1)
      expect(result.fatigue).toBe(1)
      expect(result.affinity).toBe(1)
    })

    it('典型的なクロスセッション — 8時間放置', () => {
      const state = { satisfaction: 0.7, fatigue: 0.4, affinity: 0.6 }
      const effect = calculateCrossSessionEffect(8 * 60 * 60 * 1000, 0)
      const result = applyCrossSessionChanges(state, effect)
      // satisfaction: 0.7 + (-0.16) = 0.54
      expect(result.satisfaction).toBeCloseTo(0.54, 5)
      // fatigue: 0.4 + (-0.40) = 0.0
      expect(result.fatigue).toBeCloseTo(0.0, 5)
      // affinity: 0.6 + (-0.005) ≈ 0.595
      expect(result.affinity).toBeCloseTo(0.6 + (-0.03 * (4 / 24)), 4)
    })
  })
})
