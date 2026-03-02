import { describe, it, expect } from 'vitest'
import {
  calculateBaseBiorhythm,
  applyDailyNoise,
  applyBoost,
  tickBoost,
  createFeedingBoost,
  createPettingBoost,
  mergeBoost,
  resolveBiorhythm,
  NEUTRAL_BIORHYTHM,
  ZERO_BOOST,
  DEFAULT_BIORHYTHM_CONFIG,
  type BiorhythmState,
  type BiorhythmBoost,
  type BiorhythmConfig,
} from '../../../src/domain/character/value-objects/BiorhythmState'

const MS_PER_DAY = 86_400_000

describe('BiorhythmState', () => {
  describe('calculateBaseBiorhythm', () => {
    const origin = 0
    const config = DEFAULT_BIORHYTHM_CONFIG

    it('経過0日→全軸0.0', () => {
      const result = calculateBaseBiorhythm(origin, origin, config)
      expect(result.activity).toBeCloseTo(0, 5)
      expect(result.sociability).toBeCloseTo(0, 5)
      expect(result.focus).toBeCloseTo(0, 5)
    })

    it('activity: T/4日でピーク1.0（T=5日）', () => {
      const quarterPeriod = (5 / 4) * MS_PER_DAY
      const result = calculateBaseBiorhythm(origin, origin + quarterPeriod, config)
      expect(result.activity).toBeCloseTo(1.0, 5)
    })

    it('activity: 3T/4日で谷-1.0（T=5日）', () => {
      const threeQuarterPeriod = (5 * 3 / 4) * MS_PER_DAY
      const result = calculateBaseBiorhythm(origin, origin + threeQuarterPeriod, config)
      expect(result.activity).toBeCloseTo(-1.0, 5)
    })

    it('sociability: T/4日でピーク1.0（T=7日）', () => {
      const quarterPeriod = (7 / 4) * MS_PER_DAY
      const result = calculateBaseBiorhythm(origin, origin + quarterPeriod, config)
      expect(result.sociability).toBeCloseTo(1.0, 5)
    })

    it('focus: T/4日でピーク1.0（T=11日）', () => {
      const quarterPeriod = (11 / 4) * MS_PER_DAY
      const result = calculateBaseBiorhythm(origin, origin + quarterPeriod, config)
      expect(result.focus).toBeCloseTo(1.0, 5)
    })

    it('1周期で元に戻る', () => {
      const fullPeriod = 5 * MS_PER_DAY
      const result = calculateBaseBiorhythm(origin, origin + fullPeriod, config)
      expect(result.activity).toBeCloseTo(0, 4)
    })
  })

  describe('applyDailyNoise', () => {
    const base: BiorhythmState = { activity: 0, sociability: 0, focus: 0 }

    it('同じdayIndexでは同じ結果を返す（決定論性）', () => {
      const a = applyDailyNoise(base, 42, 0.1)
      const b = applyDailyNoise(base, 42, 0.1)
      expect(a).toEqual(b)
    })

    it('異なるdayIndexでは異なる結果を返す', () => {
      const a = applyDailyNoise(base, 10, 0.1)
      const b = applyDailyNoise(base, 11, 0.1)
      expect(a).not.toEqual(b)
    })

    it('amplitude=0→ノイズなし（baseをそのまま返す）', () => {
      const result = applyDailyNoise(base, 42, 0)
      expect(result).toBe(base)
    })

    it('結果が-1~1にクランプされる', () => {
      const extreme: BiorhythmState = { activity: 0.95, sociability: -0.95, focus: 0.95 }
      const result = applyDailyNoise(extreme, 42, 0.5)
      expect(result.activity).toBeGreaterThanOrEqual(-1)
      expect(result.activity).toBeLessThanOrEqual(1)
      expect(result.sociability).toBeGreaterThanOrEqual(-1)
      expect(result.sociability).toBeLessThanOrEqual(1)
      expect(result.focus).toBeGreaterThanOrEqual(-1)
      expect(result.focus).toBeLessThanOrEqual(1)
    })
  })

  describe('applyBoost', () => {
    const base: BiorhythmState = { activity: 0.3, sociability: 0.2, focus: 0.5 }

    it('boost加算（activity, sociability）', () => {
      const boost: BiorhythmBoost = { activity: 0.2, sociability: 0.3, remainingMs: 60000 }
      const result = applyBoost(base, boost)
      expect(result.activity).toBeCloseTo(0.5, 5)
      expect(result.sociability).toBeCloseTo(0.5, 5)
    })

    it('focusはboostの影響を受けない', () => {
      const boost: BiorhythmBoost = { activity: 0.2, sociability: 0.3, remainingMs: 60000 }
      const result = applyBoost(base, boost)
      expect(result.focus).toBe(0.5)
    })

    it('remainingMs<=0→変化なし', () => {
      const boost: BiorhythmBoost = { activity: 0.5, sociability: 0.5, remainingMs: 0 }
      const result = applyBoost(base, boost)
      expect(result).toBe(base)
    })

    it('加算結果は-1~1にクランプされる', () => {
      const high: BiorhythmState = { activity: 0.9, sociability: 0.9, focus: 0.9 }
      const boost: BiorhythmBoost = { activity: 0.5, sociability: 0.5, remainingMs: 60000 }
      const result = applyBoost(high, boost)
      expect(result.activity).toBe(1.0)
      expect(result.sociability).toBe(1.0)
    })
  })

  describe('tickBoost', () => {
    it('残時間が減少する', () => {
      const boost: BiorhythmBoost = { activity: 0.3, sociability: 0.4, remainingMs: 60000 }
      const result = tickBoost(boost, 10000)
      expect(result.remainingMs).toBe(50000)
    })

    it('ブースト値が比例減衰する', () => {
      const boost: BiorhythmBoost = { activity: 0.3, sociability: 0.4, remainingMs: 60000 }
      const result = tickBoost(boost, 30000) // 半分経過
      expect(result.activity).toBeCloseTo(0.15, 5)
      expect(result.sociability).toBeCloseTo(0.2, 5)
    })

    it('残時間が0に到達→ZERO_BOOSTを返す', () => {
      const boost: BiorhythmBoost = { activity: 0.3, sociability: 0.4, remainingMs: 1000 }
      const result = tickBoost(boost, 1000)
      expect(result).toEqual(ZERO_BOOST)
    })

    it('残時間が0を超過→ZERO_BOOSTを返す', () => {
      const boost: BiorhythmBoost = { activity: 0.3, sociability: 0.4, remainingMs: 1000 }
      const result = tickBoost(boost, 5000)
      expect(result).toEqual(ZERO_BOOST)
    })

    it('remainingMs<=0のブースト→ZERO_BOOSTを返す', () => {
      const result = tickBoost(ZERO_BOOST, 1000)
      expect(result).toEqual(ZERO_BOOST)
    })
  })

  describe('createFeedingBoost', () => {
    it('activity:0.3, sociability:0.2, 5分', () => {
      const boost = createFeedingBoost()
      expect(boost.activity).toBe(0.3)
      expect(boost.sociability).toBe(0.2)
      expect(boost.remainingMs).toBe(5 * 60 * 1000)
    })
  })

  describe('createPettingBoost', () => {
    it('activity:0.1, sociability:0.4, 5分', () => {
      const boost = createPettingBoost()
      expect(boost.activity).toBe(0.1)
      expect(boost.sociability).toBe(0.4)
      expect(boost.remainingMs).toBe(5 * 60 * 1000)
    })
  })

  describe('mergeBoost', () => {
    it('各軸を加算する', () => {
      const a: BiorhythmBoost = { activity: 0.2, sociability: 0.1, remainingMs: 60000 }
      const b: BiorhythmBoost = { activity: 0.1, sociability: 0.3, remainingMs: 90000 }
      const result = mergeBoost(a, b)
      expect(result.activity).toBeCloseTo(0.3, 5)
      expect(result.sociability).toBeCloseTo(0.4, 5)
    })

    it('各軸の上限は1.0', () => {
      const a: BiorhythmBoost = { activity: 0.8, sociability: 0.7, remainingMs: 60000 }
      const b: BiorhythmBoost = { activity: 0.5, sociability: 0.5, remainingMs: 60000 }
      const result = mergeBoost(a, b)
      expect(result.activity).toBe(1.0)
      expect(result.sociability).toBe(1.0)
    })

    it('remainingMsは最大値を取る', () => {
      const a: BiorhythmBoost = { activity: 0.1, sociability: 0.1, remainingMs: 60000 }
      const b: BiorhythmBoost = { activity: 0.1, sociability: 0.1, remainingMs: 120000 }
      const result = mergeBoost(a, b)
      expect(result.remainingMs).toBe(120000)
    })
  })

  describe('resolveBiorhythm', () => {
    const origin = 0
    const config = DEFAULT_BIORHYTHM_CONFIG

    it('経過0日+ブーストなし→全軸ほぼ0（ノイズ分のみ）', () => {
      const result = resolveBiorhythm(origin, origin, ZERO_BOOST, config)
      expect(Math.abs(result.activity)).toBeLessThan(0.2)
      expect(Math.abs(result.sociability)).toBeLessThan(0.2)
      expect(Math.abs(result.focus)).toBeLessThan(0.2)
    })

    it('ブースト付きで加算される', () => {
      const boost: BiorhythmBoost = { activity: 0.5, sociability: 0.5, remainingMs: 60000 }
      const withoutBoost = resolveBiorhythm(origin, origin, ZERO_BOOST, config)
      const withBoost = resolveBiorhythm(origin, origin, boost, config)
      expect(withBoost.activity).toBeGreaterThan(withoutBoost.activity)
      expect(withBoost.sociability).toBeGreaterThan(withoutBoost.sociability)
    })

    it('全値が-1~1の範囲内', () => {
      // 多様な時刻でテスト
      for (let day = 0; day < 30; day++) {
        const now = origin + day * MS_PER_DAY
        const boost: BiorhythmBoost = { activity: 1.0, sociability: 1.0, remainingMs: 60000 }
        const result = resolveBiorhythm(origin, now, boost, config)
        expect(result.activity).toBeGreaterThanOrEqual(-1)
        expect(result.activity).toBeLessThanOrEqual(1)
        expect(result.sociability).toBeGreaterThanOrEqual(-1)
        expect(result.sociability).toBeLessThanOrEqual(1)
        expect(result.focus).toBeGreaterThanOrEqual(-1)
        expect(result.focus).toBeLessThanOrEqual(1)
      }
    })
  })

  describe('定数', () => {
    it('NEUTRAL_BIORHYTHMは全軸0', () => {
      expect(NEUTRAL_BIORHYTHM).toEqual({ activity: 0, sociability: 0, focus: 0 })
    })

    it('ZERO_BOOSTは全値0', () => {
      expect(ZERO_BOOST).toEqual({ activity: 0, sociability: 0, remainingMs: 0 })
    })
  })
})
