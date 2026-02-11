import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import { createConfig, createDefaultConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { EventBus } from '../../domain/shared/EventBus'
import type { SettingsEvent } from './SettingsEvents'

export interface TimerConfigInput {
  readonly workMinutes: number
  readonly breakMinutes: number
  readonly longBreakMinutes: number
  readonly setsPerCycle: number
}

export interface AppSettingsService {
  readonly currentConfig: TimerConfig
  updateTimerConfig(input: TimerConfigInput): void
  resetToDefault(): void
}

export function createAppSettingsService(
  bus: EventBus,
  initialConfig?: TimerConfig
): AppSettingsService {
  let currentConfig: TimerConfig = initialConfig ?? createDefaultConfig()

  function publishSettingsChanged(config: TimerConfig): void {
    const event: SettingsEvent = {
      type: 'SettingsChanged',
      config,
      timestamp: Date.now()
    }
    bus.publish(event.type, event)
  }

  return {
    get currentConfig() { return currentConfig },

    updateTimerConfig(input: TimerConfigInput): void {
      const config = createConfig(
        input.workMinutes * 60 * 1000,
        input.breakMinutes * 60 * 1000,
        input.longBreakMinutes * 60 * 1000,
        input.setsPerCycle
      )
      currentConfig = config
      publishSettingsChanged(config)
    },

    resetToDefault(): void {
      currentConfig = createDefaultConfig()
      publishSettingsChanged(currentConfig)
    }
  }
}
