import { describe, it, expect } from 'vitest'
import {
  createDefaultEmotionState,
  applyEmotionEvent,
  tickEmotion,
  type EmotionState,
} from '../../../src/domain/character/value-objects/EmotionState'

describe('EmotionState', () => {
  describe('createDefaultEmotionState', () => {
    it('デフォルト値を返す', () => {
      const state = createDefaultEmotionState()
      expect(state.satisfaction).toBe(0.5)
      expect(state.fatigue).toBe(0)
      expect(state.affinity).toBe(0)
    })

    it('初期affinityを指定できる', () => {
      const state = createDefaultEmotionState(0.3)
      expect(state.affinity).toBe(0.3)
    })

    it('affinityを1.0超でクランプする', () => {
      const state = createDefaultEmotionState(1.5)
      expect(state.affinity).toBe(1.0)
    })

    it('affinityを0未満でクランプする', () => {
      const state = createDefaultEmotionState(-0.5)
      expect(state.affinity).toBe(0)
    })
  })

  describe('applyEmotionEvent', () => {
    const base: EmotionState = { satisfaction: 0.5, fatigue: 0.5, affinity: 0.5 }

    it('fed: satisfaction+0.15, affinity+0.05', () => {
      const result = applyEmotionEvent(base, { type: 'fed' })
      expect(result.satisfaction).toBeCloseTo(0.65, 5)
      expect(result.fatigue).toBeCloseTo(0.5, 5)
      expect(result.affinity).toBeCloseTo(0.55, 5)
    })

    it('petted: affinity+0.10', () => {
      const result = applyEmotionEvent(base, { type: 'petted' })
      expect(result.satisfaction).toBeCloseTo(0.5, 5)
      expect(result.fatigue).toBeCloseTo(0.5, 5)
      expect(result.affinity).toBeCloseTo(0.6, 5)
    })

    it('pomodoro_completed: satisfaction+0.20, fatigue-0.10', () => {
      const result = applyEmotionEvent(base, { type: 'pomodoro_completed' })
      expect(result.satisfaction).toBeCloseTo(0.7, 5)
      expect(result.fatigue).toBeCloseTo(0.4, 5)
      expect(result.affinity).toBeCloseTo(0.5, 5)
    })

    it('pomodoro_aborted: satisfaction-0.10', () => {
      const result = applyEmotionEvent(base, { type: 'pomodoro_aborted' })
      expect(result.satisfaction).toBeCloseTo(0.4, 5)
      expect(result.fatigue).toBeCloseTo(0.5, 5)
      expect(result.affinity).toBeCloseTo(0.5, 5)
    })

    it('値を0.0未満にクランプする', () => {
      const low: EmotionState = { satisfaction: 0.05, fatigue: 0, affinity: 0 }
      const result = applyEmotionEvent(low, { type: 'pomodoro_aborted' })
      expect(result.satisfaction).toBe(0)
    })

    it('値を1.0超にクランプする', () => {
      const high: EmotionState = { satisfaction: 0.95, fatigue: 0.95, affinity: 0.98 }
      const result = applyEmotionEvent(high, { type: 'fed' })
      expect(result.satisfaction).toBe(1.0)
      expect(result.affinity).toBe(1.0)
    })
  })

  describe('tickEmotion', () => {
    const base: EmotionState = { satisfaction: 0.5, fatigue: 0.5, affinity: 0.5 }

    it('work中: fatigueが増加する', () => {
      const result = tickEmotion(base, 1000, true)
      expect(result.fatigue).toBeGreaterThan(0.5)
    })

    it('work中: satisfactionは変化しない', () => {
      const result = tickEmotion(base, 1000, true)
      expect(result.satisfaction).toBeCloseTo(0.5, 5)
    })

    it('非work時: fatigueが減少する', () => {
      const result = tickEmotion(base, 1000, false)
      expect(result.fatigue).toBeLessThan(0.5)
    })

    it('非work時: satisfactionが緩やかに減衰する', () => {
      const result = tickEmotion(base, 1000, false)
      expect(result.satisfaction).toBeLessThan(0.5)
    })

    it('affinityが常に緩やかに減衰する', () => {
      const workResult = tickEmotion(base, 1000, true)
      expect(workResult.affinity).toBeLessThan(0.5)

      const restResult = tickEmotion(base, 1000, false)
      expect(restResult.affinity).toBeLessThan(0.5)
    })

    it('25分のworkでfatigueが約0.15増加する', () => {
      const result = tickEmotion({ satisfaction: 0.5, fatigue: 0, affinity: 0.5 }, 25 * 60 * 1000, true)
      expect(result.fatigue).toBeCloseTo(0.15, 1)
    })

    it('fatigueは0.0未満にならない', () => {
      const low: EmotionState = { satisfaction: 0.5, fatigue: 0.001, affinity: 0.5 }
      const result = tickEmotion(low, 1000 * 60 * 60, false) // 1時間の回復
      expect(result.fatigue).toBeGreaterThanOrEqual(0)
    })

    it('fatigueは1.0を超えない', () => {
      const high: EmotionState = { satisfaction: 0.5, fatigue: 0.99, affinity: 0.5 }
      const result = tickEmotion(high, 1000 * 60 * 60 * 24, true) // 24時間work
      expect(result.fatigue).toBeLessThanOrEqual(1.0)
    })
  })
})
