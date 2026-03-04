import { describe, it, expect } from 'vitest'
import type { EmotionHistoryData } from '../../../src/domain/character/value-objects/EmotionHistory'
import {
  createDefaultEmotionHistoryData,
  extractDailyTrendEntries,
} from '../../../src/domain/character/value-objects/EmotionHistory'

/** テスト用のdailyレコードを持つEmotionHistoryDataを生成する */
function createDataWithDailies(
  records: Array<{
    date: string
    snapshot: { satisfaction: number; fatigue: number; affinity: number }
    events?: { pomodoroCompleted?: number; pomodoroAborted?: number; fed?: number; petted?: number }
  }>
): EmotionHistoryData {
  const base = createDefaultEmotionHistoryData()
  const daily: EmotionHistoryData['daily'] = {}
  for (const r of records) {
    daily[r.date] = {
      snapshot: r.snapshot,
      events: {
        pomodoroCompleted: r.events?.pomodoroCompleted ?? 0,
        pomodoroAborted: r.events?.pomodoroAborted ?? 0,
        fed: r.events?.fed ?? 0,
        petted: r.events?.petted ?? 0,
      },
      lastPomodoroAt: null,
      lastFeedingAt: null,
    }
  }
  return { ...base, daily }
}

describe('extractDailyTrendEntries', () => {
  it('空のdailyから空配列を返す', () => {
    const data = createDefaultEmotionHistoryData()
    const result = extractDailyTrendEntries(data, '2026-03-01', '2026-03-07')
    expect(result).toEqual([])
  })

  it('期間内のデータのみ抽出する', () => {
    const data = createDataWithDailies([
      { date: '2026-03-01', snapshot: { satisfaction: 0.5, fatigue: 0.1, affinity: 0.2 } },
      { date: '2026-03-03', snapshot: { satisfaction: 0.6, fatigue: 0.2, affinity: 0.3 } },
      { date: '2026-03-05', snapshot: { satisfaction: 0.7, fatigue: 0.3, affinity: 0.4 } },
    ])
    const result = extractDailyTrendEntries(data, '2026-03-02', '2026-03-04')
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-03')
  })

  it('日付昇順にソートされる', () => {
    const data = createDataWithDailies([
      { date: '2026-03-05', snapshot: { satisfaction: 0.7, fatigue: 0.3, affinity: 0.4 } },
      { date: '2026-03-01', snapshot: { satisfaction: 0.5, fatigue: 0.1, affinity: 0.2 } },
      { date: '2026-03-03', snapshot: { satisfaction: 0.6, fatigue: 0.2, affinity: 0.3 } },
    ])
    const result = extractDailyTrendEntries(data, '2026-03-01', '2026-03-05')
    expect(result.map(e => e.date)).toEqual(['2026-03-01', '2026-03-03', '2026-03-05'])
  })

  it('snapshot値が正しくマッピングされる', () => {
    const data = createDataWithDailies([
      { date: '2026-03-03', snapshot: { satisfaction: 0.8, fatigue: 0.2, affinity: 0.6 } },
    ])
    const result = extractDailyTrendEntries(data, '2026-03-01', '2026-03-07')
    expect(result[0].satisfaction).toBe(0.8)
    expect(result[0].fatigue).toBe(0.2)
    expect(result[0].affinity).toBe(0.6)
  })

  it('イベントカウントが正しくマッピングされる', () => {
    const data = createDataWithDailies([
      {
        date: '2026-03-03',
        snapshot: { satisfaction: 0.5, fatigue: 0, affinity: 0 },
        events: { pomodoroCompleted: 4, fed: 2, petted: 3 },
      },
    ])
    const result = extractDailyTrendEntries(data, '2026-03-01', '2026-03-07')
    expect(result[0].pomodoroCompleted).toBe(4)
    expect(result[0].fed).toBe(2)
    expect(result[0].petted).toBe(3)
  })

  it('範囲外のデータは含まれない', () => {
    const data = createDataWithDailies([
      { date: '2026-02-28', snapshot: { satisfaction: 0.1, fatigue: 0.1, affinity: 0.1 } },
      { date: '2026-03-03', snapshot: { satisfaction: 0.5, fatigue: 0.5, affinity: 0.5 } },
      { date: '2026-03-10', snapshot: { satisfaction: 0.9, fatigue: 0.9, affinity: 0.9 } },
    ])
    const result = extractDailyTrendEntries(data, '2026-03-01', '2026-03-07')
    expect(result).toHaveLength(1)
    expect(result[0].date).toBe('2026-03-03')
  })

  it('元データを変更しない（イミュータブル）', () => {
    const data = createDataWithDailies([
      { date: '2026-03-03', snapshot: { satisfaction: 0.5, fatigue: 0.2, affinity: 0.3 } },
    ])
    const dailyBefore = JSON.stringify(data.daily)
    extractDailyTrendEntries(data, '2026-03-01', '2026-03-07')
    expect(JSON.stringify(data.daily)).toBe(dailyBefore)
  })
})
