import { describe, it, expect } from 'vitest'
import { createClimateGridAdapter } from '../../../src/infrastructure/climate/ClimateGridAdapter'
import type { ClimateGridJson } from '../../../src/infrastructure/climate/ClimateGridAdapter'

/** 1地点分のモックデータ生成 */
function makeGridPoint(lat: number, lon: number, months: [number, number, number, number, number][]) {
  return { lat, lon, months }
}

/** 12ヶ月分の均一データ生成 */
function uniformMonths(tavg: number, tmax: number, tmin: number, prec: number, humidity: number): [number, number, number, number, number][] {
  return Array.from({ length: 12 }, () => [tavg, tmax, tmin, prec, humidity] as [number, number, number, number, number])
}

/** テスト用グリッドJSON生成 */
function makeGridData(grid: ReturnType<typeof makeGridPoint>[]): ClimateGridJson {
  return {
    meta: { source: 'test', resolution: 5, generatedAt: '2026-01-01' },
    grid,
  }
}

describe('ClimateGridAdapter', () => {
  it('isLoadedが常にtrueを返す', () => {
    const adapter = createClimateGridAdapter(makeGridData([]))
    expect(adapter.isLoaded).toBe(true)
  })

  it('グリッドポイント上の座標では正確な値を返す', () => {
    const months = uniformMonths(25, 30, 20, 50, 70)
    const adapter = createClimateGridAdapter(makeGridData([
      makeGridPoint(37.5, 137.5, months),
    ]))

    const climate = adapter.getMonthlyClimate(37.5, 137.5)
    expect(climate[0].avgTempC).toBeCloseTo(25, 1)
    expect(climate[0].avgHighTempC).toBeCloseTo(30, 1)
    // グリッドデータの値はmm/day。アダプターが月日数を掛けてmm/monthに変換する。
    // month=1(January)→ 50 mm/day * 31 = 1550 mm/month
    expect(climate[0].avgPrecipMm).toBeCloseTo(50 * 31, 1)
  })

  it('双線形補間: 4隅の中間で平均値を返す', () => {
    // 4つのグリッドポイント（5度間隔）
    const adapter = createClimateGridAdapter(makeGridData([
      makeGridPoint(32.5, 132.5, uniformMonths(10, 15, 5, 40, 50)),
      makeGridPoint(32.5, 137.5, uniformMonths(20, 25, 15, 80, 70)),
      makeGridPoint(37.5, 132.5, uniformMonths(30, 35, 25, 120, 90)),
      makeGridPoint(37.5, 137.5, uniformMonths(40, 45, 35, 160, 80)),
    ]))

    // 4隅の中央 (35, 135)
    const climate = adapter.getMonthlyClimate(35, 135)
    // 双線形補間: (10+20+30+40)/4 = 25
    expect(climate[0].avgTempC).toBeCloseTo(25, 0)
  })

  it('海洋スナッピング: データなしの座標は最寄りの陸地データを使う', () => {
    // 1地点のみ（周囲は海洋=null）
    const adapter = createClimateGridAdapter(makeGridData([
      makeGridPoint(37.5, 137.5, uniformMonths(18, 22, 14, 90, 65)),
    ]))

    // 隣接グリッド（データなし→スナッピング）
    const climate = adapter.getMonthlyClimate(42.5, 137.5)
    expect(climate[0].avgTempC).toBeCloseTo(18, 0)
  })

  it('経度ラッピング: 日付変更線付近で正常に動作する', () => {
    // 東経177.5と西経177.5（グリッド上の両端）
    const adapter = createClimateGridAdapter(makeGridData([
      makeGridPoint(37.5, 177.5, uniformMonths(12, 16, 8, 60, 55)),
      makeGridPoint(37.5, -177.5, uniformMonths(14, 18, 10, 70, 60)),
    ]))

    // 両端の間（180度 = 日付変更線付近）→ラッピングで補間
    const climate = adapter.getMonthlyClimate(37.5, 180)
    expect(climate[0].avgTempC).toBeGreaterThanOrEqual(12)
    expect(climate[0].avgTempC).toBeLessThanOrEqual(14)
  })

  it('月番号が1-12で返される', () => {
    const adapter = createClimateGridAdapter(makeGridData([
      makeGridPoint(37.5, 137.5, uniformMonths(15, 20, 10, 80, 60)),
    ]))

    const climate = adapter.getMonthlyClimate(37.5, 137.5)
    for (let i = 0; i < 12; i++) {
      expect(climate[i].month).toBe(i + 1)
    }
  })

  it('全てnullのグリッドではフォールバック値15を返す', () => {
    // 空のグリッド
    const adapter = createClimateGridAdapter(makeGridData([]))

    const climate = adapter.getMonthlyClimate(0, 0)
    // findNearestが全てnullを返す → bilinear内で ?? 15
    expect(climate[0].avgTempC).toBe(15)
  })
})
