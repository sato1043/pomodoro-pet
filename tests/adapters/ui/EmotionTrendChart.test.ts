import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vanilla-extract CSSモジュールをモック（vitest環境ではvanilla-extractが動作しない）
vi.mock('../../../src/adapters/ui/styles/emotion-trend-chart.css', () => ({}))
vi.mock('../../../src/adapters/ui/styles/biorhythm-chart.css', () => ({}))

import type { DailyTrendEntry } from '../../../src/domain/character/value-objects/EmotionHistory'
import type { EmotionHistoryData } from '../../../src/domain/character/value-objects/EmotionHistory'
import { createDefaultEmotionHistoryData } from '../../../src/domain/character/value-objects/EmotionHistory'
import { buildEmotionTrendData, computeDateRange, fillDailyGaps } from '../../../src/adapters/ui/EmotionTrendChart'

function makeEntry(
  date: string,
  satisfaction = 0.5,
  fatigue = 0.3,
  affinity = 0.2,
): DailyTrendEntry {
  return { date, satisfaction, fatigue, affinity, pomodoroCompleted: 0, fed: 0, petted: 0 }
}

describe('buildEmotionTrendData', () => {
  const chartW = 200
  const chartH = 100
  const padLeft = 20
  const padTop = 10

  it('空配列から空の曲線を返す', () => {
    const result = buildEmotionTrendData([], chartW, chartH, padLeft, padTop)
    expect(result.satisfaction).toEqual([])
    expect(result.fatigue).toEqual([])
    expect(result.affinity).toEqual([])
  })

  it('全座標がチャート領域内に収まる', () => {
    const entries = [
      makeEntry('2026-03-01', 0, 0, 0),
      makeEntry('2026-03-02', 1, 1, 1),
      makeEntry('2026-03-03', 0.5, 0.5, 0.5),
    ]
    const result = buildEmotionTrendData(entries, chartW, chartH, padLeft, padTop)

    for (const curve of [result.satisfaction, result.fatigue, result.affinity]) {
      for (const p of curve) {
        expect(p.x).toBeGreaterThanOrEqual(padLeft)
        expect(p.x).toBeLessThanOrEqual(padLeft + chartW)
        expect(p.y).toBeGreaterThanOrEqual(padTop)
        expect(p.y).toBeLessThanOrEqual(padTop + chartH)
      }
    }
  })

  it('x座標が均等配置される', () => {
    const entries = [
      makeEntry('2026-03-01'),
      makeEntry('2026-03-02'),
      makeEntry('2026-03-03'),
    ]
    const result = buildEmotionTrendData(entries, chartW, chartH, padLeft, padTop)
    const xs = result.satisfaction.map(p => p.x)
    expect(xs[0]).toBeCloseTo(padLeft, 1)
    expect(xs[1]).toBeCloseTo(padLeft + chartW / 2, 1)
    expect(xs[2]).toBeCloseTo(padLeft + chartW, 1)
  })

  it('n===1のとき右端(padLeft+chartW)にプロットされる', () => {
    const entries = [makeEntry('2026-03-01')]
    const result = buildEmotionTrendData(entries, chartW, chartH, padLeft, padTop)
    expect(result.satisfaction[0].x).toBeCloseTo(padLeft + chartW, 1)
  })

  it('y=1.0→上端(padTop)、y=0.0→下端(padTop+chartH)にマッピング', () => {
    const entries = [
      makeEntry('2026-03-01', 1.0, 0.0, 0.5),
    ]
    const result = buildEmotionTrendData(entries, chartW, chartH, padLeft, padTop)
    // satisfaction=1.0 → y=padTop
    expect(result.satisfaction[0].y).toBeCloseTo(padTop, 1)
    // fatigue=0.0 → y=padTop+chartH
    expect(result.fatigue[0].y).toBeCloseTo(padTop + chartH, 1)
    // affinity=0.5 → y=padTop+chartH/2
    expect(result.affinity[0].y).toBeCloseTo(padTop + chartH / 2, 1)
  })

})

describe('fillDailyGaps', () => {
  it('startDate〜endDateの全日付を埋める', () => {
    const entries = [makeEntry('2026-03-01', 0.5, 0.3, 0.2)]
    const result = fillDailyGaps(entries, '2026-03-01', '2026-03-03')
    expect(result).toHaveLength(3)
    expect(result.map(e => e.date)).toEqual(['2026-03-01', '2026-03-02', '2026-03-03'])
  })

  it('データがない日は直前の感情値を引き継ぐ', () => {
    const entries = [makeEntry('2026-03-01', 0.8, 0.4, 0.6)]
    const result = fillDailyGaps(entries, '2026-03-01', '2026-03-03')
    expect(result[1].satisfaction).toBe(0.8)
    expect(result[1].fatigue).toBe(0.4)
    expect(result[1].affinity).toBe(0.6)
  })

  it('先頭ギャップは最初のデータ値で埋める', () => {
    const entries = [makeEntry('2026-03-03', 0.7, 0.2, 0.5)]
    const result = fillDailyGaps(entries, '2026-03-01', '2026-03-03')
    expect(result[0].satisfaction).toBe(0.7)
    expect(result[1].satisfaction).toBe(0.7)
    expect(result[2].satisfaction).toBe(0.7)
  })

  it('中間ギャップは直前のデータ値で埋める', () => {
    const entries = [
      makeEntry('2026-03-01', 0.3, 0.1, 0.2),
      makeEntry('2026-03-05', 0.8, 0.5, 0.7),
    ]
    const result = fillDailyGaps(entries, '2026-03-01', '2026-03-05')
    expect(result).toHaveLength(5)
    // 3/2〜3/4は3/1の値を引き継ぐ
    expect(result[1].satisfaction).toBe(0.3)
    expect(result[2].satisfaction).toBe(0.3)
    expect(result[3].satisfaction).toBe(0.3)
    // 3/5は実データ
    expect(result[4].satisfaction).toBe(0.8)
  })

  it('空のentries→全日付が初期値0で埋まる', () => {
    const result = fillDailyGaps([], '2026-03-01', '2026-03-03')
    expect(result).toHaveLength(3)
    expect(result[0].satisfaction).toBe(0)
  })
})

describe('computeDateRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-04T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("'7d'が6日前〜今日を返す", () => {
    const data = createDefaultEmotionHistoryData()
    const { startDate, endDate } = computeDateRange('7d', data)
    expect(startDate).toBe('2026-02-26')
    expect(endDate).toBe('2026-03-04')
  })

  it("'30d'が29日前〜今日を返す", () => {
    const data = createDefaultEmotionHistoryData()
    const { startDate, endDate } = computeDateRange('30d', data)
    expect(startDate).toBe('2026-02-03')
    expect(endDate).toBe('2026-03-04')
  })

  it("'all'がdaily最古日〜今日を返す", () => {
    const base = createDefaultEmotionHistoryData()
    const data: EmotionHistoryData = {
      ...base,
      daily: {
        '2026-01-15': {
          snapshot: { satisfaction: 0.5, fatigue: 0, affinity: 0 },
          events: { pomodoroCompleted: 0, pomodoroAborted: 0, fed: 0, petted: 0 },
          lastPomodoroAt: null,
          lastFeedingAt: null,
        },
        '2026-02-20': {
          snapshot: { satisfaction: 0.6, fatigue: 0.1, affinity: 0.2 },
          events: { pomodoroCompleted: 1, pomodoroAborted: 0, fed: 0, petted: 0 },
          lastPomodoroAt: null,
          lastFeedingAt: null,
        },
      },
    }
    const { startDate, endDate } = computeDateRange('all', data)
    expect(startDate).toBe('2026-01-15')
    expect(endDate).toBe('2026-03-04')
  })
})
