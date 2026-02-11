import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'

export type SettingsEvent = {
  type: 'SettingsChanged'
  config: TimerConfig
  timestamp: number
}
