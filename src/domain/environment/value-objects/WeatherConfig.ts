export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy'

export type TimeOfDay = 'morning' | 'day' | 'evening' | 'night'

/** 雲の量レベル: 0〜5 の6段階 */
export type CloudDensityLevel = 0 | 1 | 2 | 3 | 4 | 5

export interface WeatherConfig {
  readonly weather: WeatherType
  readonly timeOfDay: TimeOfDay
  readonly autoWeather: boolean
  readonly autoTimeOfDay: boolean
  readonly cloudDensityLevel: CloudDensityLevel
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
    cloudDensityLevel: CLOUD_PRESET['sunny'],
  }
}

export function resolveTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5 && hour <= 8) return 'morning'
  if (hour >= 9 && hour <= 16) return 'day'
  if (hour >= 17 && hour <= 19) return 'evening'
  return 'night'
}
