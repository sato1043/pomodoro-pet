import type { WeatherType, CloudDensityLevel } from './WeatherConfig'
import type { KouClimate } from './ClimateData'

// --- 型定義 ---

export interface WeatherDecision {
  readonly weather: WeatherType
  readonly precipIntensity: number   // 0.0-1.0（降水の相対強度）
  readonly cloudDensity: number      // 0.0-1.0（雲の相対密度）
}

// --- 決定的PRNG ---

/** 決定的32bit PRNG。seedから0.0-1.0の値を生成 */
export function mulberry32(seed: number): number {
  let t = (seed + 0x6D2B79F5) | 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

// --- 天気決定 ---

const MAX_DAILY_PRECIP_MM = 30

/** 気候データと気温から天気を決定する純粋関数 */
export function decideWeather(
  kouClimate: KouClimate,
  estimatedTempC: number,
  seed: number
): WeatherDecision {
  const primaryRand = seed

  // 降水判定
  if (primaryRand < kouClimate.precipProbability) {
    const weather: WeatherType = estimatedTempC < 2 ? 'snowy' : 'rainy'
    const kouDays = 5
    const dailyPrecipMm = kouClimate.avgPrecipMm / kouDays
    const precipIntensity = Math.max(0, Math.min(1, dailyPrecipMm / MAX_DAILY_PRECIP_MM))
    const cloudDensity = 0.7 + precipIntensity * 0.3
    return { weather, precipIntensity, cloudDensity }
  }

  // 曇り判定
  const secondaryRand = mulberry32(seed * 2654435761)
  if (kouClimate.avgHumidity > 70 && secondaryRand < 0.4) {
    const cloudDensity = 0.3 + kouClimate.avgHumidity / 300
    return { weather: 'cloudy', precipIntensity: 0, cloudDensity }
  }

  // 晴れ
  const cloudDensity = kouClimate.avgHumidity / 200
  return { weather: 'sunny', precipIntensity: 0, cloudDensity }
}

// --- 降水量連動（5.5g） ---

/** 降水強度から粒子数を算出 */
export function computeParticleCount(
  weather: 'rainy' | 'snowy',
  precipIntensity: number
): number {
  const t = Math.max(0, Math.min(1, precipIntensity))
  if (weather === 'rainy') {
    return Math.round(100 + t * 1100)  // 100〜1200
  }
  return Math.round(100 + t * 800)    // 100〜900
}

/** autoモードの連続cloudDensityを離散CloudDensityLevelに変換 */
export function cloudDensityToLevel(cloudDensity: number): CloudDensityLevel {
  return Math.round(Math.max(0, Math.min(5, cloudDensity * 5))) as CloudDensityLevel
}
