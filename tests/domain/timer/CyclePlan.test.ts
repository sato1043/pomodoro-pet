import { describe, it, expect } from 'vitest'
import { buildCyclePlan, cycleTotalMs } from '../../../src/domain/timer/value-objects/CyclePlan'
import { createConfig } from '../../../src/domain/timer/value-objects/TimerConfig'

describe('CyclePlan', () => {
  describe('buildCyclePlan', () => {
    it('Sets=1: [work, break]（Long Breakなし）', () => {
      const config = createConfig(25 * 60000, 5 * 60000, 15 * 60000, 1)
      const plan = buildCyclePlan(config)
      expect(plan).toHaveLength(2)
      expect(plan[0]).toEqual({ type: 'work', durationMs: 25 * 60000, setNumber: 1 })
      expect(plan[1]).toEqual({ type: 'break', durationMs: 5 * 60000, setNumber: 1 })
    })

    it('Sets=2: [work, break, work, long-break]', () => {
      const config = createConfig(25 * 60000, 5 * 60000, 15 * 60000, 2)
      const plan = buildCyclePlan(config)
      expect(plan).toHaveLength(4)
      expect(plan[0]).toEqual({ type: 'work', durationMs: 25 * 60000, setNumber: 1 })
      expect(plan[1]).toEqual({ type: 'break', durationMs: 5 * 60000, setNumber: 1 })
      expect(plan[2]).toEqual({ type: 'work', durationMs: 25 * 60000, setNumber: 2 })
      expect(plan[3]).toEqual({ type: 'long-break', durationMs: 15 * 60000, setNumber: 2 })
    })

    it('Sets=4: 最終セットのみlong-break', () => {
      const config = createConfig(25 * 60000, 5 * 60000, 15 * 60000, 4)
      const plan = buildCyclePlan(config)
      expect(plan).toHaveLength(8)
      expect(plan.filter(p => p.type === 'work')).toHaveLength(4)
      expect(plan.filter(p => p.type === 'break')).toHaveLength(3)
      expect(plan.filter(p => p.type === 'long-break')).toHaveLength(1)
      expect(plan[7]).toEqual({ type: 'long-break', durationMs: 15 * 60000, setNumber: 4 })
    })

    it('各フェーズのsetNumberが正しい', () => {
      const config = createConfig(3000, 2000, 4000, 3)
      const plan = buildCyclePlan(config)
      expect(plan.map(p => p.setNumber)).toEqual([1, 1, 2, 2, 3, 3])
    })
  })

  describe('cycleTotalMs', () => {
    it('Sets=1: work + break', () => {
      const config = createConfig(25 * 60000, 5 * 60000, 15 * 60000, 1)
      const plan = buildCyclePlan(config)
      expect(cycleTotalMs(plan)).toBe(30 * 60000)
    })

    it('Sets=2: work*2 + break + long-break', () => {
      const config = createConfig(25 * 60000, 5 * 60000, 15 * 60000, 2)
      const plan = buildCyclePlan(config)
      expect(cycleTotalMs(plan)).toBe(70 * 60000)
    })

    it('Sets=4: work*4 + break*3 + long-break', () => {
      const config = createConfig(25 * 60000, 5 * 60000, 15 * 60000, 4)
      const plan = buildCyclePlan(config)
      expect(cycleTotalMs(plan)).toBe(130 * 60000)
    })
  })
})
