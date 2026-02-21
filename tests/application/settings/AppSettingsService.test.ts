import { describe, it, expect, beforeEach } from 'vitest'
import { createAppSettingsService, type AppSettingsService } from '../../../src/application/settings/AppSettingsService'
import { createEventBus } from '../../../src/domain/shared/EventBus'
import { createConfig, createDefaultConfig } from '../../../src/domain/timer/value-objects/TimerConfig'
import type { EventBus } from '../../../src/domain/shared/EventBus'
import type { SettingsEvent } from '../../../src/application/settings/SettingsEvents'

describe('AppSettingsService', () => {
  let bus: EventBus
  let service: AppSettingsService

  beforeEach(() => {
    bus = createEventBus()
    service = createAppSettingsService(bus)
  })

  describe('初期状態', () => {
    it('デフォルトConfigを保持する', () => {
      const defaultConfig = createDefaultConfig()
      expect(service.currentConfig).toEqual(defaultConfig)
    })

    it('コンストラクタで渡したConfigを保持する', () => {
      const custom = createConfig(10000, 5000, 8000, 2)
      const customService = createAppSettingsService(bus, custom)
      expect(customService.currentConfig).toEqual(custom)
    })
  })

  describe('updateTimerConfig', () => {
    it('分単位の入力からms単位のConfigを生成する', () => {
      service.updateTimerConfig({
        workMinutes: 30,
        breakMinutes: 10,
        longBreakMinutes: 20,
        setsPerCycle: 3
      })
      expect(service.currentConfig).toEqual({
        workDurationMs: 30 * 60 * 1000,
        breakDurationMs: 10 * 60 * 1000,
        longBreakDurationMs: 20 * 60 * 1000,
        setsPerCycle: 3
      })
    })

    it('SettingsChangedイベントをEventBusに発行する', () => {
      const received: SettingsEvent[] = []
      bus.subscribe<SettingsEvent>('SettingsChanged', (event) => {
        received.push(event)
      })

      service.updateTimerConfig({
        workMinutes: 30,
        breakMinutes: 10,
        longBreakMinutes: 20,
        setsPerCycle: 3
      })

      expect(received).toHaveLength(1)
      expect(received[0].type).toBe('SettingsChanged')
      expect(received[0].config.workDurationMs).toBe(30 * 60 * 1000)
    })

    it('workMinutesが0以下でエラーを投げる', () => {
      expect(() => {
        service.updateTimerConfig({
          workMinutes: 0,
          breakMinutes: 5,
          longBreakMinutes: 15,
          setsPerCycle: 4
        })
      }).toThrow('workDurationMs must be positive')
    })

    it('breakMinutesが負でエラーを投げる', () => {
      expect(() => {
        service.updateTimerConfig({
          workMinutes: 25,
          breakMinutes: -1,
          longBreakMinutes: 15,
          setsPerCycle: 4
        })
      }).toThrow('breakDurationMs must be positive')
    })

    it('longBreakMinutesが0でエラーを投げる', () => {
      expect(() => {
        service.updateTimerConfig({
          workMinutes: 25,
          breakMinutes: 5,
          longBreakMinutes: 0,
          setsPerCycle: 4
        })
      }).toThrow('longBreakDurationMs must be positive')
    })

    it('setsPerCycleが小数でエラーを投げる', () => {
      expect(() => {
        service.updateTimerConfig({
          workMinutes: 25,
          breakMinutes: 5,
          longBreakMinutes: 15,
          setsPerCycle: 3.5
        })
      }).toThrow('setsPerCycle must be a positive integer')
    })

    it('setsPerCycleが0でエラーを投げる', () => {
      expect(() => {
        service.updateTimerConfig({
          workMinutes: 25,
          breakMinutes: 5,
          longBreakMinutes: 15,
          setsPerCycle: 0
        })
      }).toThrow('setsPerCycle must be a positive integer')
    })

    it('バリデーション失敗時はConfigを変更しない', () => {
      const before = service.currentConfig
      try {
        service.updateTimerConfig({
          workMinutes: 0,
          breakMinutes: 5,
          longBreakMinutes: 15,
          setsPerCycle: 4
        })
      } catch {
        // expected
      }
      expect(service.currentConfig).toEqual(before)
    })

    it('バリデーション失敗時はイベントを発行しない', () => {
      const received: SettingsEvent[] = []
      bus.subscribe<SettingsEvent>('SettingsChanged', (event) => {
        received.push(event)
      })

      try {
        service.updateTimerConfig({
          workMinutes: 0,
          breakMinutes: 5,
          longBreakMinutes: 15,
          setsPerCycle: 4
        })
      } catch {
        // expected
      }
      expect(received).toHaveLength(0)
    })
  })

  describe('backgroundConfig', () => {
    it('初期状態でbackgroundAudio=true, backgroundNotify=true', () => {
      expect(service.backgroundConfig).toEqual({
        backgroundAudio: true,
        backgroundNotify: true,
      })
    })

    it('updateBackgroundConfigで値が変更される', () => {
      service.updateBackgroundConfig({
        backgroundAudio: false,
        backgroundNotify: true,
      })
      expect(service.backgroundConfig).toEqual({
        backgroundAudio: false,
        backgroundNotify: true,
      })
    })

    it('updateBackgroundConfigで両方をfalseにできる', () => {
      service.updateBackgroundConfig({
        backgroundAudio: false,
        backgroundNotify: false,
      })
      expect(service.backgroundConfig).toEqual({
        backgroundAudio: false,
        backgroundNotify: false,
      })
    })

    it('resetToDefaultでデフォルト値に戻す', () => {
      service.updateBackgroundConfig({
        backgroundAudio: false,
        backgroundNotify: false,
      })
      service.resetToDefault()
      expect(service.backgroundConfig).toEqual({
        backgroundAudio: true,
        backgroundNotify: true,
      })
    })
  })

  describe('resetToDefault', () => {
    it('デフォルト値に戻す', () => {
      service.updateTimerConfig({
        workMinutes: 30,
        breakMinutes: 10,
        longBreakMinutes: 20,
        setsPerCycle: 3
      })
      service.resetToDefault()
      expect(service.currentConfig).toEqual(createDefaultConfig())
    })

    it('SettingsChangedイベントを発行する', () => {
      const received: SettingsEvent[] = []
      bus.subscribe<SettingsEvent>('SettingsChanged', (event) => {
        received.push(event)
      })

      service.resetToDefault()

      expect(received).toHaveLength(1)
      expect(received[0].type).toBe('SettingsChanged')
      expect(received[0].config).toEqual(createDefaultConfig())
    })
  })
})
