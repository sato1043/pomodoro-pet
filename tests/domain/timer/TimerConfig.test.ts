import { describe, it, expect } from 'vitest'
import { parseDebugTimer, createDefaultConfig } from '../../../src/domain/timer/value-objects/TimerConfig'

describe('parseDebugTimer', () => {
  it('単一値 → 全フェーズ同一秒数、Sets=2', () => {
    const config = parseDebugTimer('10')
    expect(config).toEqual({
      workDurationMs: 10000,
      breakDurationMs: 10000,
      longBreakDurationMs: 10000,
      setsPerCycle: 2
    })
  })

  it('2値 → work/break指定、long-break=break、Sets=2', () => {
    const config = parseDebugTimer('10/5')
    expect(config).toEqual({
      workDurationMs: 10000,
      breakDurationMs: 5000,
      longBreakDurationMs: 5000,
      setsPerCycle: 2
    })
  })

  it('3値 → work/break/long-break個別指定、Sets=2', () => {
    const config = parseDebugTimer('10/5/15')
    expect(config).toEqual({
      workDurationMs: 10000,
      breakDurationMs: 5000,
      longBreakDurationMs: 15000,
      setsPerCycle: 2
    })
  })

  it('4値 → 全項目個別指定', () => {
    const config = parseDebugTimer('10/5/15/3')
    expect(config).toEqual({
      workDurationMs: 10000,
      breakDurationMs: 5000,
      longBreakDurationMs: 15000,
      setsPerCycle: 3
    })
  })

  it('空文字 → null', () => {
    expect(parseDebugTimer('')).toBeNull()
  })

  it('非数値 → null', () => {
    expect(parseDebugTimer('abc')).toBeNull()
  })

  it('5値以上 → null', () => {
    expect(parseDebugTimer('10/5/15/3/1')).toBeNull()
  })

  it('0を含む → null', () => {
    expect(parseDebugTimer('0/5')).toBeNull()
  })

  it('負数を含む → null', () => {
    expect(parseDebugTimer('-1/5')).toBeNull()
  })
})

describe('createDefaultConfig', () => {
  it('通常モードのデフォルト値を返す', () => {
    const config = createDefaultConfig()
    expect(config).toEqual({
      workDurationMs: 25 * 60 * 1000,
      breakDurationMs: 5 * 60 * 1000,
      longBreakDurationMs: 15 * 60 * 1000,
      setsPerCycle: 1
    })
  })
})
