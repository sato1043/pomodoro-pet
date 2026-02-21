import { describe, it, expect } from 'vitest'
import { emptyDailyStats, todayKey, formatDateKey } from '../../../src/domain/statistics/StatisticsTypes'

describe('emptyDailyStats', () => {
  it('全フィールドが0を返す', () => {
    const stats = emptyDailyStats()
    expect(stats).toEqual({
      completedCycles: 0,
      abortedCycles: 0,
      workPhasesCompleted: 0,
      breakPhasesCompleted: 0,
      totalWorkMs: 0,
      totalBreakMs: 0,
    })
  })

  it('呼び出しごとに新しいオブジェクトを返す', () => {
    const a = emptyDailyStats()
    const b = emptyDailyStats()
    expect(a).not.toBe(b)
  })
})

describe('todayKey', () => {
  it('YYYY-MM-DD形式の文字列を返す', () => {
    const key = todayKey()
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('今日の日付と一致する', () => {
    const key = todayKey()
    const d = new Date()
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    expect(key).toBe(expected)
  })
})

describe('formatDateKey', () => {
  it('Dateを YYYY-MM-DD 形式に変換する', () => {
    const d = new Date(2025, 0, 5) // 2025-01-05
    expect(formatDateKey(d)).toBe('2025-01-05')
  })

  it('月と日が1桁の場合ゼロ埋めする', () => {
    const d = new Date(2025, 2, 3) // 2025-03-03
    expect(formatDateKey(d)).toBe('2025-03-03')
  })
})
