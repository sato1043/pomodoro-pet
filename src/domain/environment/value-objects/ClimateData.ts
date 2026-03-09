import type { ScenePresetName } from './ScenePreset'

// --- 型定義 ---

/** 月別気候データ（1グリッドポイント分） */
export interface MonthlyClimateData {
  readonly month: number           // 1-12
  readonly avgTempC: number
  readonly avgHighTempC: number
  readonly avgLowTempC: number
  readonly avgHumidity: number     // 0-100
  readonly avgPrecipMm: number    // 月間降水量 (mm)
}

/** 1候分（約5日間）の気候定数 */
export interface KouClimate {
  readonly kouIndex: number            // 0-71
  readonly avgTempC: number            // 平均気温 (℃)
  readonly avgHighTempC: number        // 平均最高気温 (℃)
  readonly avgLowTempC: number         // 平均最低気温 (℃)
  readonly avgHumidity: number         // 平均湿度 (0-100%)
  readonly precipProbability: number   // 降水確率 (0.0-1.0)
  readonly avgPrecipMm: number         // 候あたり（約5日）平均降水量 (mm)
}

/** 気候設定 */
export interface ClimateConfig {
  readonly mode: 'preset' | 'custom'
  readonly presetName?: string
  readonly latitude: number
  readonly longitude: number
  readonly label: string
  readonly timezone?: string
}

/** 気候グリッドデータへのアクセスポート */
export interface ClimateGridPort {
  getMonthlyClimate(latitude: number, longitude: number): readonly MonthlyClimateData[]
  readonly isLoaded: boolean
}

/** プリセット都市 */
export interface CityPreset {
  readonly name: string
  readonly latitude: number
  readonly longitude: number
}

export const CITY_PRESETS: readonly CityPreset[] = [
  { name: 'Sydney', latitude: -33.8688, longitude: 151.2093 },
  { name: 'Tokyo', latitude: 35.6762, longitude: 139.6503 },
  { name: 'London', latitude: 51.5074, longitude: -0.1278 },
  { name: 'New York', latitude: 40.7128, longitude: -74.0060 },
  { name: 'Hawaii', latitude: 21.3069, longitude: -157.8583 },
  { name: 'Dubai', latitude: 25.2048, longitude: 55.2708 },
  { name: 'Reykjavik', latitude: 64.1466, longitude: -21.9426 },
  { name: 'Ushuaia', latitude: -54.8019, longitude: -68.3030 },
]

export const DEFAULT_CLIMATE: ClimateConfig = {
  mode: 'preset',
  presetName: 'Tokyo',
  latitude: 35.6762,
  longitude: 139.6503,
  label: 'Tokyo',
}

// --- ヘルパー関数 ---

/** 月の日数（うるう年非考慮。概算用途なので十分） */
function daysInMonth(month: number): number {
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
}

/** 年内通算日から月番号(1-12)を返す（概算） */
function dayOfYearToMonth(dayOfYear: number): number {
  const cumDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365]
  for (let m = 1; m <= 12; m++) {
    if (dayOfYear < cumDays[m]) return m
  }
  return 12
}

/** 指定通算日から当月末日までの残り日数 */
function daysUntilEndOfMonth(dayOfYear: number, month: number): number {
  const cumDays = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365]
  return cumDays[month] - dayOfYear
}

/** 黄経→年内通算日の概算 */
export function eclipticLonToDayOfYear(eclipticLon: number): number {
  // 春分（黄経0度）≒ 3月20日 = day 79
  // 1度 ≒ 1.0146日
  return Math.round(((eclipticLon * 1.0146) + 79) % 365.25)
}

/** 単一月内に収まる候の気候データ生成 */
function buildKouClimate(
  kouIndex: number,
  m: MonthlyClimateData,
  kouDays: number
): KouClimate {
  const avgPrecipMm = m.avgPrecipMm * kouDays / daysInMonth(m.month)
  return {
    kouIndex,
    avgTempC: m.avgTempC,
    avgHighTempC: m.avgHighTempC,
    avgLowTempC: m.avgLowTempC,
    avgHumidity: m.avgHumidity,
    avgPrecipMm,
    precipProbability: Math.min(0.95, avgPrecipMm / (kouDays * 10)),
  }
}

/** 按分合成 */
function buildKouClimateBlended(
  kouIndex: number,
  m1: MonthlyClimateData,
  m2: MonthlyClimateData,
  ratio: number,
  kouDays: number
): KouClimate {
  const lerp = (a: number, b: number) => a * ratio + b * (1 - ratio)
  const avgPrecipMm = lerp(
    m1.avgPrecipMm * kouDays / daysInMonth(m1.month),
    m2.avgPrecipMm * kouDays / daysInMonth(m2.month)
  )
  return {
    kouIndex,
    avgTempC: lerp(m1.avgTempC, m2.avgTempC),
    avgHighTempC: lerp(m1.avgHighTempC, m2.avgHighTempC),
    avgLowTempC: lerp(m1.avgLowTempC, m2.avgLowTempC),
    avgHumidity: lerp(m1.avgHumidity, m2.avgHumidity),
    avgPrecipMm,
    precipProbability: Math.min(0.95, avgPrecipMm / (kouDays * 10)),
  }
}

// --- 公開関数 ---

/** 月別気候データを72候分に按分する純粋関数 */
export function interpolateToKouClimate(
  monthlyData: readonly MonthlyClimateData[]
): readonly KouClimate[] {
  const result: KouClimate[] = []

  for (let kouIndex = 0; kouIndex < 72; kouIndex++) {
    const eclipticStart = (kouIndex * 5 + 285) % 360
    const dayOfYearStart = eclipticLonToDayOfYear(eclipticStart)
    const dayOfYearEnd = eclipticLonToDayOfYear((eclipticStart + 5) % 360)
    const kouDays = ((dayOfYearEnd - dayOfYearStart + 365) % 365) || 5

    const startMonth = dayOfYearToMonth(dayOfYearStart)
    const endMonth = dayOfYearToMonth(dayOfYearEnd)

    if (startMonth === endMonth) {
      const m = monthlyData[startMonth - 1]
      result.push(buildKouClimate(kouIndex, m, kouDays))
    } else {
      const daysInStart = daysUntilEndOfMonth(dayOfYearStart, startMonth)
      const ratio = daysInStart / kouDays
      const m1 = monthlyData[startMonth - 1]
      const m2 = monthlyData[endMonth - 1]
      result.push(buildKouClimateBlended(kouIndex, m1, m2, ratio, kouDays))
    }
  }

  return result
}

/** 現在日時の推定気温を返す */
export function estimateTemperature(
  kouClimate: KouClimate,
  hourOfDay: number
): number {
  // 日内変動: 最高気温14時、最低気温5時
  const amplitude = (kouClimate.avgHighTempC - kouClimate.avgLowTempC) / 2
  return kouClimate.avgTempC + amplitude * Math.cos((hourOfDay - 14) * Math.PI / 12)
}

/** 色のlerp */
function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff
  const r = Math.round(r1 + (r2 - r1) * t)
  const g = Math.round(g1 + (g2 - g1) * t)
  const b = Math.round(b1 + (b2 - b1) * t)
  return (r << 16) | (g << 8) | b
}

/** 乾燥地テーブル: 気温→砂色〜土色 */
function dryGroundColor(tempC: number): number {
  if (tempC <= 0) return 0x8a8578      // 灰砂（厳冬）
  if (tempC <= 15) return lerpColor(0x8a8578, 0xc4a862, tempC / 15)
  if (tempC <= 30) return lerpColor(0xc4a862, 0xd4b878, (tempC - 15) / 15)
  return 0xd4b878                       // 明るい砂色（酷暑）
}

/** 湿潤地テーブル: 気温→灰緑〜深緑 */
function wetGroundColor(tempC: number): number {
  if (tempC <= 0) return 0x729862      // 冬枯れ（緑味残す）
  if (tempC <= 10) return lerpColor(0x729862, 0x509836, tempC / 10)
  if (tempC <= 25) return lerpColor(0x509836, 0x469830, (tempC - 10) / 15)
  if (tempC <= 35) return lerpColor(0x469830, 0x3a6a22, (tempC - 25) / 10)
  return 0x3a6a22                       // 酷暑の深緑
}

/**
 * 気温+降水量→地面色の連続マッピング。
 * avgPrecipMm: 候あたり（約5日間）の平均降水量(mm)。
 * 降水量 ≤1mm → 乾燥テーブル、≥10mm → 湿潤テーブル、間はlerp。
 */
export function temperatureToGroundColor(
  tempC: number,
  scenePreset: ScenePresetName,
  avgPrecipMm: number = 5
): number {
  if (scenePreset === 'seaside') return 0xd4b878  // 砂浜色固定

  const dry = dryGroundColor(tempC)
  const wet = wetGroundColor(tempC)

  // 降水量による乾燥〜湿潤ブレンド
  const moisture = Math.max(0, Math.min(1, (avgPrecipMm - 1) / 9))
  return lerpColor(dry, wet, moisture)
}
