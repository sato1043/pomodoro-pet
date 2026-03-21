import type { ScenePresetName } from './ScenePreset'
import type { ClimateConfig } from './ClimateData'
export type { ScenePresetName }

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy'

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'

/** 雲の量レベル: 0〜5 の6段階 */
export type CloudDensityLevel = 0 | 1 | 2 | 3 | 4 | 5

/** 手動月高度プリセット */
export type MoonAltitude = 'horizon' | 'low' | 'mid' | 'high'

export interface WeatherConfig {
  readonly weather: WeatherType
  readonly timeOfDay: TimeOfDay
  readonly autoWeather: boolean
  readonly autoTimeOfDay: boolean
  readonly autoKou: boolean
  readonly manualKouIndex: number
  readonly cloudDensityLevel: CloudDensityLevel
  readonly scenePreset: ScenePresetName
  readonly climate?: ClimateConfig
  readonly moonAltitude: MoonAltitude
  readonly autoMoon: boolean
}

const CLOUD_PRESET: Record<WeatherType, CloudDensityLevel> = {
  sunny: 1,
  cloudy: 3,
  rainy: 4,
  snowy: 4,
}

export function cloudPresetLevel(weather: WeatherType): CloudDensityLevel {
  return CLOUD_PRESET[weather]
}

export function createDefaultWeatherConfig(): WeatherConfig {
  return {
    weather: 'sunny',
    timeOfDay: 'day',
    autoWeather: false,
    autoTimeOfDay: false,
    autoKou: true,
    manualKouIndex: 0,
    cloudDensityLevel: CLOUD_PRESET['sunny'],
    scenePreset: 'meadow',
    moonAltitude: 'mid',
    autoMoon: true,
  }
}

/** 月高度プリセット→仰角マッピング */
export const MOON_ALTITUDE_DEG: Record<MoonAltitude, number> = {
  horizon: 10,
  low: 15,
  mid: 25,
  high: 33,
}

export function resolveTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour <= 8) return 'morning'
  if (hour >= 9 && hour <= 16) return 'day'
  if (hour >= 17 && hour <= 19) return 'evening'
  return 'night'
}
