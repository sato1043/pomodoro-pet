import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { SoundConfigInput } from './AppSettingsService'

export type ThemePreference = 'system' | 'light' | 'dark'

export type SettingsEvent =
  | { type: 'SettingsChanged'; config: TimerConfig; timestamp: number }
  | { type: 'SoundSettingsLoaded'; sound: SoundConfigInput; timestamp: number }
  | { type: 'ThemeLoaded'; theme: ThemePreference; timestamp: number }
