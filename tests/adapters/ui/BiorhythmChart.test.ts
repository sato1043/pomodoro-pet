import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// vanilla-extract CSSモジュールをモック（vitest環境ではvanilla-extractが動作しない）
vi.mock('../../../src/adapters/ui/styles/biorhythm-chart.css', () => ({}))

import { buildBiorhythmCurves, pointsToPath } from '../../../src/adapters/ui/BiorhythmChart'
import type { BiorhythmConfig } from '../../../src/domain/character/value-objects/BiorhythmState'

const TEST_CONFIG: BiorhythmConfig = {
  activityPeriodDays: 5,
  sociabilityPeriodDays: 7,
  focusPeriodDays: 11,
  noiseAmplitude: 0,
}

// テスト用レイアウトパラメータ
const CHART_W = 200
const CHART_H = 60
const PAD_LEFT = 4
const PAD_TOP = 10

describe('pointsToPath', () => {
  it('空配列 → 空文字列', () => {
    expect(pointsToPath([])).toBe('')
  })

  it('1点 → M コマンドのみ', () => {
    expect(pointsToPath([{ x: 10, y: 20 }])).toBe('M10.0,20.0')
  })

  it('複数点 → M + L コマンド連結', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 10, y: 20 },
      { x: 30.5, y: 40.75 },
    ]
    expect(pointsToPath(points)).toBe('M0.0,0.0 L10.0,20.0 L30.5,40.8')
  })
})

describe('buildBiorhythmCurves', () => {
  beforeEach(() => {
    // 2026-03-03T00:00:00 に固定
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 3, 0, 0, 0))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('3軸すべての座標配列を返す', () => {
    const originDay = new Date(2026, 0, 1).getTime()
    const result = buildBiorhythmCurves(
      originDay, TEST_CONFIG, CHART_W, CHART_H, PAD_LEFT, PAD_TOP, 3, 3, 4,
    )

    expect(result.activity).toBeInstanceOf(Array)
    expect(result.sociability).toBeInstanceOf(Array)
    expect(result.focus).toBeInstanceOf(Array)
    expect(result.activity.length).toBeGreaterThan(0)
  })

  it('サンプル数 = totalDays * samplesPerDay + 1', () => {
    const daysBefore = 3
    const daysAfter = 3
    const samplesPerDay = 4
    const expected = (daysBefore + daysAfter) * samplesPerDay + 1

    const result = buildBiorhythmCurves(
      Date.now(), TEST_CONFIG, CHART_W, CHART_H, PAD_LEFT, PAD_TOP,
      daysBefore, daysAfter, samplesPerDay,
    )

    expect(result.activity.length).toBe(expected)
    expect(result.sociability.length).toBe(expected)
    expect(result.focus.length).toBe(expected)
  })

  it('全座標がチャート領域内に収まる', () => {
    const result = buildBiorhythmCurves(
      Date.now(), TEST_CONFIG, CHART_W, CHART_H, PAD_LEFT, PAD_TOP, 3, 3, 4,
    )

    for (const curve of [result.activity, result.sociability, result.focus]) {
      for (const p of curve) {
        expect(p.x).toBeGreaterThanOrEqual(PAD_LEFT)
        expect(p.x).toBeLessThanOrEqual(PAD_LEFT + CHART_W)
        expect(p.y).toBeGreaterThanOrEqual(PAD_TOP)
        expect(p.y).toBeLessThanOrEqual(PAD_TOP + CHART_H)
      }
    }
  })

  it('todayXがチャート領域内にある', () => {
    const result = buildBiorhythmCurves(
      Date.now(), TEST_CONFIG, CHART_W, CHART_H, PAD_LEFT, PAD_TOP, 3, 3, 4,
    )

    expect(result.todayX).toBeGreaterThanOrEqual(PAD_LEFT)
    expect(result.todayX).toBeLessThanOrEqual(PAD_LEFT + CHART_W)
  })

  it('todayValuesの各値が-1〜1の範囲（サイン波）', () => {
    const result = buildBiorhythmCurves(
      Date.now(), TEST_CONFIG, CHART_W, CHART_H, PAD_LEFT, PAD_TOP, 3, 3, 4,
    )

    expect(result.todayValues.activity).toBeGreaterThanOrEqual(-1)
    expect(result.todayValues.activity).toBeLessThanOrEqual(1)
    expect(result.todayValues.sociability).toBeGreaterThanOrEqual(-1)
    expect(result.todayValues.sociability).toBeLessThanOrEqual(1)
    expect(result.todayValues.focus).toBeGreaterThanOrEqual(-1)
    expect(result.todayValues.focus).toBeLessThanOrEqual(1)
  })

  it('originDayが1周期前だとtodayValuesがほぼ0（activity周期5日）', () => {
    // 5日前のoriginDay → 1周期経過 → sin(2π) ≈ 0
    const todayStart = new Date(2026, 2, 3).getTime()
    const fiveDaysAgo = todayStart - 5 * 86_400_000

    const result = buildBiorhythmCurves(
      fiveDaysAgo, TEST_CONFIG, CHART_W, CHART_H, PAD_LEFT, PAD_TOP, 3, 3, 4,
    )

    expect(result.todayValues.activity).toBeCloseTo(0, 5)
  })

  it('originDayが半周期前だとtodayValuesがほぼ0（activity周期5日 → 2.5日前）', () => {
    const todayStart = new Date(2026, 2, 3).getTime()
    const halfPeriodAgo = todayStart - 2.5 * 86_400_000

    const result = buildBiorhythmCurves(
      halfPeriodAgo, TEST_CONFIG, CHART_W, CHART_H, PAD_LEFT, PAD_TOP, 3, 3, 4,
    )

    // sin(π) ≈ 0
    expect(result.todayValues.activity).toBeCloseTo(0, 5)
  })

  it('originDayが1/4周期前だとtodayValuesがほぼ1（activity周期5日 → 1.25日前）', () => {
    const todayStart = new Date(2026, 2, 3).getTime()
    const quarterPeriodAgo = todayStart - 1.25 * 86_400_000

    const result = buildBiorhythmCurves(
      quarterPeriodAgo, TEST_CONFIG, CHART_W, CHART_H, PAD_LEFT, PAD_TOP, 3, 3, 4,
    )

    // sin(π/2) = 1
    expect(result.todayValues.activity).toBeCloseTo(1, 5)
  })

  it('x座標は先頭がpadLeft、末尾がpadLeft+chartW', () => {
    const result = buildBiorhythmCurves(
      Date.now(), TEST_CONFIG, CHART_W, CHART_H, PAD_LEFT, PAD_TOP, 3, 3, 4,
    )

    const first = result.activity[0]
    const last = result.activity[result.activity.length - 1]
    expect(first.x).toBeCloseTo(PAD_LEFT, 5)
    expect(last.x).toBeCloseTo(PAD_LEFT + CHART_W, 5)
  })
})
