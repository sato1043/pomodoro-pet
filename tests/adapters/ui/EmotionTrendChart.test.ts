import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vanilla-extract CSSモジュールをモック（vitest環境ではvanilla-extractが動作しない）
vi.mock('../../../src/adapters/ui/styles/emotion-trend-chart.css', () => ({}))
vi.mock('../../../src/adapters/ui/styles/biorhythm-chart.css', () => ({}))

import type { DailyTrendEntry } from '../../../src/domain/character/value-objects/EmotionHistory'
import type { EmotionHistoryData } from '../../../src/domain/character/value-objects/EmotionHistory'
import { createDefaultEmotionHistoryData } from '../../../src/domain/character/value-objects/EmotionHistory'
import { buildEmotionTrendData, computeDateRange } from '../../../src/adapters/ui/EmotionTrendChart'

function makeEntry(
  date: string,
  satisfaction = 0.5,
  fatigue = 0.3,
  affinity = 0.2,
  pomodoroCompleted = 0,
  fed = 0,
  petted = 0,
): DailyTrendEntry {
  return { date, satisfaction, fatigue, affinity, pomodoroCompleted, fed, petted }
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
    expect(result.dateLabels).toEqual([])
    expect(result.eventBars).toEqual([])
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

  it('dateLabelsが生成される', () => {
    const entries = [
      makeEntry('2026-03-01'),
      makeEntry('2026-03-02'),
      makeEntry('2026-03-03'),
    ]
    const result = buildEmotionTrendData(entries, chartW, chartH, padLeft, padTop)
    expect(result.dateLabels.length).toBeGreaterThan(0)
    expect(result.dateLabels[0].label).toBe('3/1')
  })

  it('eventBarsの高さがpomodoroCompleted最大値に対する比例', () => {
    const entries = [
      makeEntry('2026-03-01', 0.5, 0.5, 0.5, 2),
      makeEntry('2026-03-02', 0.5, 0.5, 0.5, 4),
      makeEntry('2026-03-03', 0.5, 0.5, 0.5, 0),
    ]
    const result = buildEmotionTrendData(entries, chartW, chartH, padLeft, padTop)
    // pomodoroCompleted=0のエントリはeventBarsに含まれない
    expect(result.eventBars).toHaveLength(2)
    // 最大(4)のバーが最も高い
    const maxBar = result.eventBars.find(b => b.count === 4)!
    const halfBar = result.eventBars.find(b => b.count === 2)!
    expect(maxBar.height).toBeGreaterThan(halfBar.height)
    expect(halfBar.height).toBeCloseTo(maxBar.height / 2, 1)
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
