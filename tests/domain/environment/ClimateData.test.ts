import { describe, it, expect } from 'vitest'
import {
  interpolateToKouClimate,
  estimateTemperature,
  temperatureToGroundColor,
  eclipticLonToDayOfYear,
  classifyKoppen,
  CITY_PRESETS,
} from '../../../src/domain/environment/value-objects/ClimateData'
import type { MonthlyClimateData } from '../../../src/domain/environment/value-objects/ClimateData'

/** ヘルパー: 月番号付き簡易月別データ生成 */
function makeMonthly(
  data: readonly { temp: number; precip: number }[]
): MonthlyClimateData[] {
  return data.map((d, i) => ({
    month: i + 1,
    avgTempC: d.temp,
    avgHighTempC: d.temp + 5,
    avgLowTempC: d.temp - 5,
    avgHumidity: 60,
    avgPrecipMm: d.precip,
  }))
}

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
  it('湿潤+高温→深緑', () => {
    const color = temperatureToGroundColor(30, 'meadow', 15)
    // 湿潤テーブルの高温側: 0x3a6a22
    const g = (color >> 8) & 0xff
    expect(g).toBeGreaterThan(0x60) // 緑チャンネルが支配的
  })

  it('湿潤+低温→灰オリーブ', () => {
    const color = temperatureToGroundColor(-5, 'meadow', 15)
    // 湿潤テーブルの厳冬: 0x729862
    const g = (color >> 8) & 0xff
    const r = (color >> 16) & 0xff
    expect(g).toBeGreaterThan(r) // 緑 > 赤（茶色ではない）
  })

  it('乾燥+高温→砂色', () => {
    const color = temperatureToGroundColor(35, 'meadow', 0)
    // 乾燥テーブルの高温: 0xd4b878
    const r = (color >> 16) & 0xff
    const g = (color >> 8) & 0xff
    expect(r).toBeGreaterThan(g) // 赤 > 緑（砂色系）
  })

  it('乾燥+低温→灰砂', () => {
    const color = temperatureToGroundColor(-5, 'meadow', 0)
    // 乾燥テーブルの厳冬: 0x8a8578
    const r = (color >> 16) & 0xff
    const g = (color >> 8) & 0xff
    expect(Math.abs(r - g)).toBeLessThan(20) // ほぼ灰色
  })

  it('中間降水量で乾燥と湿潤の中間色', () => {
    const dry = temperatureToGroundColor(20, 'meadow', 0)
    const wet = temperatureToGroundColor(20, 'meadow', 15)
    const mid = temperatureToGroundColor(20, 'meadow', 5)
    // 赤チャンネルは乾燥（砂色=高R）→湿潤（緑色=低R）で単調減少
    const midR = (mid >> 16) & 0xff
    const dryR = (dry >> 16) & 0xff
    const wetR = (wet >> 16) & 0xff
    expect(midR).toBeLessThan(dryR)
    expect(midR).toBeGreaterThan(wetR)
  })

  it('湿潤テーブルの0-25°C帯で緑チャンネルが一定', () => {
    const temps = [0, 5, 10, 15, 20, 25]
    const greens = temps.map(t => {
      const color = temperatureToGroundColor(t, 'meadow', 15)
      return (color >> 8) & 0xff
    })
    // 全温度帯で同じ緑チャンネル値
    for (const g of greens) {
      expect(g).toBe(greens[0])
    }
  })

  it('湿潤テーブルの25-35°C帯で緑チャンネルが減少', () => {
    const g25 = (temperatureToGroundColor(25, 'meadow', 15) >> 8) & 0xff
    const g30 = (temperatureToGroundColor(30, 'meadow', 15) >> 8) & 0xff
    const g35 = (temperatureToGroundColor(35, 'meadow', 15) >> 8) & 0xff
    expect(g30).toBeLessThan(g25)
    expect(g35).toBeLessThan(g30)
  })

  it('湿潤テーブル35°C以上は固定色', () => {
    const c35 = temperatureToGroundColor(35, 'meadow', 15)
    const c40 = temperatureToGroundColor(40, 'meadow', 15)
    const c50 = temperatureToGroundColor(50, 'meadow', 15)
    expect(c35).toBe(c40)
    expect(c40).toBe(c50)
  })

  it('seasideプリセットは降水量に関係なく砂浜色固定', () => {
    expect(temperatureToGroundColor(30, 'seaside', 0)).toBe(0xd4b878)
    expect(temperatureToGroundColor(-10, 'seaside', 20)).toBe(0xd4b878)
  })

  it('デフォルト降水量（省略時）で動作する', () => {
    const color = temperatureToGroundColor(20, 'meadow')
    expect(color).toBeDefined()
    expect(typeof color).toBe('number')
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

describe('classifyKoppen', () => {
  it('東京 → Cfa（温暖湿潤）', () => {
    const result = classifyKoppen(TOKYO_MONTHLY)
    expect(result.code).toBe('Cfa')
    expect(result.label).toBe('Humid subtropical')
  })

  it('熱帯雨林（全月18℃以上・最少雨月≥60mm）→ Af', () => {
    const data = makeMonthly(
      Array.from({ length: 12 }, () => ({ temp: 27, precip: 200 }))
    )
    expect(classifyKoppen(data).code).toBe('Af')
  })

  it('熱帯モンスーン（全月18℃以上・最少雨月<60mm・Am条件）→ Am', () => {
    // MAP=2340, 100-MAP/25=100-93.6=6.4, Pdry=40 >= 6.4 → Am
    const data = makeMonthly(
      Array.from({ length: 12 }, (_, i) => ({ temp: 26, precip: i === 0 ? 40 : 209 }))
    )
    expect(classifyKoppen(data).code).toBe('Am')
  })

  it('サバナ（全月18℃以上・乾季あり）→ Aw', () => {
    // MAP=920, 100-MAP/25=100-36.8=63.2, Pdry=5 < 63.2 → Aw
    const data = makeMonthly(
      Array.from({ length: 12 }, (_, i) => ({ temp: 26, precip: i < 3 ? 5 : 150 }))
    )
    expect(classifyKoppen(data).code).toBe('Aw')
  })

  it('高温砂漠（極端に少ない降水量・高温）→ BWh', () => {
    const data = makeMonthly(
      Array.from({ length: 12 }, () => ({ temp: 30, precip: 3 }))
    )
    expect(classifyKoppen(data).code).toBe('BWh')
  })

  it('寒冷砂漠（極端に少ない降水量・低温）→ BWk', () => {
    const data = makeMonthly(
      Array.from({ length: 12 }, (_, i) => ({
        temp: i >= 3 && i <= 8 ? 15 : -5,
        precip: 2,
      }))
    )
    expect(classifyKoppen(data).code).toBe('BWk')
  })

  it('高温ステップ（少ない降水量・高温）→ BSh', () => {
    // Tavg=25, 均等型閾値=20*(25+7)=640, MAP=360 → 320<360<640 → BS
    const data = makeMonthly(
      Array.from({ length: 12 }, () => ({ temp: 25, precip: 30 }))
    )
    expect(classifyKoppen(data).code).toBe('BSh')
  })

  it('海洋性（最寒月≥-3℃・最暖月<22℃・4ヶ月以上10℃超）→ Cfb', () => {
    // ロンドン風: 冬5℃、夏18℃、均等降水
    const data = makeMonthly([
      { temp: 5, precip: 55 }, { temp: 5, precip: 40 }, { temp: 7, precip: 40 },
      { temp: 9, precip: 40 }, { temp: 13, precip: 50 }, { temp: 16, precip: 45 },
      { temp: 18, precip: 45 }, { temp: 18, precip: 50 }, { temp: 15, precip: 50 },
      { temp: 12, precip: 70 }, { temp: 8, precip: 60 }, { temp: 5, precip: 55 },
    ])
    expect(classifyKoppen(data).code).toBe('Cfb')
  })

  it('ツンドラ（最暖月0-10℃）→ ET', () => {
    const data = makeMonthly(
      Array.from({ length: 12 }, (_, i) => ({
        temp: i >= 5 && i <= 7 ? 5 : -15,
        precip: 20,
      }))
    )
    expect(classifyKoppen(data).code).toBe('ET')
  })

  it('氷雪（最暖月<0℃）→ EF', () => {
    const data = makeMonthly(
      Array.from({ length: 12 }, () => ({ temp: -20, precip: 10 }))
    )
    expect(classifyKoppen(data).code).toBe('EF')
  })

  it('亜寒帯（最寒月<-3℃・最暖月≥10℃）→ Df系', () => {
    // モスクワ風: 冬-10℃、夏20℃
    const data = makeMonthly([
      { temp: -10, precip: 40 }, { temp: -8, precip: 35 }, { temp: -2, precip: 35 },
      { temp: 6, precip: 40 }, { temp: 13, precip: 55 }, { temp: 17, precip: 75 },
      { temp: 20, precip: 85 }, { temp: 18, precip: 75 }, { temp: 12, precip: 60 },
      { temp: 5, precip: 55 }, { temp: -2, precip: 50 }, { temp: -7, precip: 45 },
    ])
    const result = classifyKoppen(data)
    expect(result.code).toMatch(/^Df/)
  })

  it('地中海性（夏の最少雨月が冬の最多雨月の1/3未満かつ<40mm）→ Cs系', () => {
    // 夏は乾燥、冬は多雨
    const data = makeMonthly([
      { temp: 10, precip: 80 }, { temp: 11, precip: 70 }, { temp: 13, precip: 50 },
      { temp: 15, precip: 30 }, { temp: 18, precip: 15 }, { temp: 22, precip: 5 },
      { temp: 25, precip: 2 }, { temp: 25, precip: 5 }, { temp: 22, precip: 20 },
      { temp: 17, precip: 60 }, { temp: 13, precip: 80 }, { temp: 10, precip: 90 },
    ])
    const result = classifyKoppen(data)
    expect(result.code).toMatch(/^Cs/)
  })

  it('返り値にcodeとlabelが含まれる', () => {
    const result = classifyKoppen(TOKYO_MONTHLY)
    expect(result).toHaveProperty('code')
    expect(result).toHaveProperty('label')
    expect(result.code.length).toBeGreaterThanOrEqual(2)
    expect(result.label.length).toBeGreaterThan(0)
  })

  it('南半球の都市でも正しく分類される', () => {
    // シドニー風（南半球）: 冬=6-8月、夏=12-2月
    const data = makeMonthly([
      { temp: 23, precip: 100 }, { temp: 23, precip: 120 }, { temp: 21, precip: 130 },
      { temp: 18, precip: 130 }, { temp: 15, precip: 120 }, { temp: 12, precip: 130 },
      { temp: 12, precip: 100 }, { temp: 13, precip: 80 }, { temp: 15, precip: 70 },
      { temp: 18, precip: 75 }, { temp: 20, precip: 80 }, { temp: 22, precip: 80 },
    ])
    const result = classifyKoppen(data)
    expect(result.code).toMatch(/^Cf/) // Cfa or Cfb
  })
})
