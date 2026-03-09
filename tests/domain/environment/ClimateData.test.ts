import { describe, it, expect } from 'vitest'
import {
  interpolateToKouClimate,
  estimateTemperature,
  temperatureToGroundColor,
  eclipticLonToDayOfYear,
  CITY_PRESETS,
} from '../../../src/domain/environment/value-objects/ClimateData'
import type { MonthlyClimateData } from '../../../src/domain/environment/value-objects/ClimateData'

/** 東京風の月別テストデータ */
const TOKYO_MONTHLY: MonthlyClimateData[] = [
  { month: 1, avgTempC: 5.2, avgHighTempC: 9.6, avgLowTempC: 0.9, avgHumidity: 52, avgPrecipMm: 52 },
  { month: 2, avgTempC: 5.7, avgHighTempC: 10.4, avgLowTempC: 1.7, avgHumidity: 53, avgPrecipMm: 56 },
  { month: 3, avgTempC: 8.7, avgHighTempC: 13.6, avgLowTempC: 4.4, avgHumidity: 56, avgPrecipMm: 118 },
  { month: 4, avgTempC: 13.9, avgHighTempC: 19.0, avgLowTempC: 9.4, avgHumidity: 62, avgPrecipMm: 125 },
  { month: 5, avgTempC: 18.2, avgHighTempC: 22.9, avgLowTempC: 14.0, avgHumidity: 66, avgPrecipMm: 138 },
  { month: 6, avgTempC: 21.4, avgHighTempC: 25.5, avgLowTempC: 18.0, avgHumidity: 75, avgPrecipMm: 168 },
  { month: 7, avgTempC: 25.0, avgHighTempC: 29.2, avgLowTempC: 22.0, avgHumidity: 77, avgPrecipMm: 154 },
  { month: 8, avgTempC: 26.4, avgHighTempC: 31.0, avgLowTempC: 23.0, avgHumidity: 73, avgPrecipMm: 168 },
  { month: 9, avgTempC: 22.8, avgHighTempC: 27.1, avgLowTempC: 19.7, avgHumidity: 75, avgPrecipMm: 210 },
  { month: 10, avgTempC: 17.5, avgHighTempC: 21.5, avgLowTempC: 14.2, avgHumidity: 69, avgPrecipMm: 198 },
  { month: 11, avgTempC: 12.1, avgHighTempC: 16.3, avgLowTempC: 8.3, avgHumidity: 62, avgPrecipMm: 93 },
  { month: 12, avgTempC: 7.6, avgHighTempC: 11.9, avgLowTempC: 3.5, avgHumidity: 56, avgPrecipMm: 51 },
]

describe('eclipticLonToDayOfYear', () => {
  it('黄経0度（春分）≒ day 79（3月20日）', () => {
    const day = eclipticLonToDayOfYear(0)
    expect(day).toBeGreaterThanOrEqual(75)
    expect(day).toBeLessThanOrEqual(83)
  })

  it('黄経90度（夏至）≒ day 170（6月21日）', () => {
    const day = eclipticLonToDayOfYear(90)
    expect(day).toBeGreaterThanOrEqual(165)
    expect(day).toBeLessThanOrEqual(175)
  })

  it('黄経285度（小寒）≒ day 6（1月6日）前後', () => {
    const day = eclipticLonToDayOfYear(285)
    // (285 * 1.0146 + 79) % 365.25 ≒ 368.16 % 365.25 ≒ 2.9 → round → 3
    // 少し幅を持たせる
    expect(day).toBeGreaterThanOrEqual(0)
    expect(day).toBeLessThanOrEqual(10)
  })
})

describe('interpolateToKouClimate', () => {
  it('72候分のデータを生成する', () => {
    const result = interpolateToKouClimate(TOKYO_MONTHLY)
    expect(result).toHaveLength(72)
  })

  it('各候のkouIndexが0-71で一意', () => {
    const result = interpolateToKouClimate(TOKYO_MONTHLY)
    const indices = result.map(k => k.kouIndex)
    expect(new Set(indices).size).toBe(72)
    expect(Math.min(...indices)).toBe(0)
    expect(Math.max(...indices)).toBe(71)
  })

  it('冬の候は低い気温を持つ', () => {
    const result = interpolateToKouClimate(TOKYO_MONTHLY)
    // index 0 = 小寒初候（1月初旬）
    expect(result[0].avgTempC).toBeLessThan(10)
  })

  it('夏の候は高い気温を持つ', () => {
    const result = interpolateToKouClimate(TOKYO_MONTHLY)
    // index 33 = 夏至初候（6月下旬）
    expect(result[33].avgTempC).toBeGreaterThan(18)
  })

  it('precipProbabilityは0-0.95の範囲', () => {
    const result = interpolateToKouClimate(TOKYO_MONTHLY)
    for (const kou of result) {
      expect(kou.precipProbability).toBeGreaterThanOrEqual(0)
      expect(kou.precipProbability).toBeLessThanOrEqual(0.95)
    }
  })
})

describe('estimateTemperature', () => {
  it('14時に最高気温付近になる', () => {
    const kou = interpolateToKouClimate(TOKYO_MONTHLY)[33] // 夏至頃
    const temp14 = estimateTemperature(kou, 14)
    const temp5 = estimateTemperature(kou, 5)
    expect(temp14).toBeGreaterThan(temp5)
  })

  it('5時に最低気温付近になる', () => {
    const kou = interpolateToKouClimate(TOKYO_MONTHLY)[33]
    const temp5 = estimateTemperature(kou, 5)
    // avgLowTempCに近い値
    expect(temp5).toBeLessThan(kou.avgTempC)
  })

  it('日内変動の振幅が合理的', () => {
    const kou = interpolateToKouClimate(TOKYO_MONTHLY)[33]
    const tempMax = estimateTemperature(kou, 14)
    const tempMin = estimateTemperature(kou, 5)
    const range = tempMax - tempMin
    // avgHigh - avgLow程度の範囲
    expect(range).toBeGreaterThan(0)
    expect(range).toBeLessThan(kou.avgHighTempC - kou.avgLowTempC + 5)
  })
})

describe('temperatureToGroundColor', () => {
  it('高温→濃い緑', () => {
    const color = temperatureToGroundColor(30, 'meadow')
    expect(color).toBe(0x4a7a2e)
  })

  it('低温→灰白', () => {
    const color = temperatureToGroundColor(-5, 'meadow')
    expect(color).toBe(0x8a8a7a)
  })

  it('中間気温で中間色', () => {
    const color = temperatureToGroundColor(10, 'meadow')
    expect(color).not.toBe(0x4a7a2e)
    expect(color).not.toBe(0x8a8a7a)
  })

  it('seasideプリセットは砂浜色固定', () => {
    expect(temperatureToGroundColor(30, 'seaside')).toBe(0xd4b878)
    expect(temperatureToGroundColor(-10, 'seaside')).toBe(0xd4b878)
  })
})

describe('CITY_PRESETS', () => {
  it('8都市が定義されている', () => {
    expect(CITY_PRESETS).toHaveLength(8)
  })

  it('都市名が一意である', () => {
    const names = CITY_PRESETS.map(c => c.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('全都市の緯度が-90〜90の範囲', () => {
    for (const city of CITY_PRESETS) {
      expect(city.latitude).toBeGreaterThanOrEqual(-90)
      expect(city.latitude).toBeLessThanOrEqual(90)
    }
  })

  it('全都市の経度が-180〜180の範囲', () => {
    for (const city of CITY_PRESETS) {
      expect(city.longitude).toBeGreaterThanOrEqual(-180)
      expect(city.longitude).toBeLessThanOrEqual(180)
    }
  })

  it('全都市のclimateZoneが有効なケッペン気候区分コード', () => {
    // ケッペン気候区分の主要コード（第1文字+第2〜3文字の組み合わせ）
    const validZones = [
      'Af', 'Am', 'Aw', 'As',           // 熱帯
      'BWh', 'BWk', 'BSh', 'BSk',       // 乾燥帯
      'Csa', 'Csb', 'Csc',              // 温帯（地中海性）
      'Cwa', 'Cwb', 'Cwc',              // 温帯（温暖冬季少雨）
      'Cfa', 'Cfb', 'Cfc',              // 温帯（湿潤）
      'Dsa', 'Dsb', 'Dsc', 'Dsd',       // 亜寒帯（地中海性）
      'Dwa', 'Dwb', 'Dwc', 'Dwd',       // 亜寒帯（冬季少雨）
      'Dfa', 'Dfb', 'Dfc', 'Dfd',       // 亜寒帯（湿潤）
      'ET', 'EF',                        // 寒帯
    ]
    for (const city of CITY_PRESETS) {
      expect(validZones).toContain(city.climateZone)
    }
  })

  it('各都市の座標が地理的に妥当な範囲にある', () => {
    const expectations: Record<string, { latRange: [number, number]; lonRange: [number, number] }> = {
      'Tokyo':        { latRange: [35, 36], lonRange: [139, 140] },
      'Sydney':       { latRange: [-34, -33], lonRange: [151, 152] },
      'London':       { latRange: [51, 52], lonRange: [-1, 1] },
      'New York':     { latRange: [40, 41], lonRange: [-75, -73] },
      'Dubai':        { latRange: [25, 26], lonRange: [55, 56] },
      'Hawaii':       { latRange: [21, 22], lonRange: [-158, -157] },
      'Reykjavik':    { latRange: [64, 65], lonRange: [-22, -21] },
      'Ushuaia':      { latRange: [-55, -54], lonRange: [-69, -68] },
    }
    for (const city of CITY_PRESETS) {
      const exp = expectations[city.name]
      expect(exp).toBeDefined()
      expect(city.latitude).toBeGreaterThanOrEqual(exp.latRange[0])
      expect(city.latitude).toBeLessThanOrEqual(exp.latRange[1])
      expect(city.longitude).toBeGreaterThanOrEqual(exp.lonRange[0])
      expect(city.longitude).toBeLessThanOrEqual(exp.lonRange[1])
    }
  })
})
