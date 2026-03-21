import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
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

  describe('weatherConfig', () => {
    it('初期状態でデフォルト天気設定を保持する', () => {
      expect(service.weatherConfig).toEqual({
        weather: 'sunny',
        timeOfDay: 'day',
        autoWeather: false,
        autoTimeOfDay: false,
        autoKou: true,
        manualKouIndex: 0,
        cloudDensityLevel: 1,
        scenePreset: 'meadow',
        moonAltitude: 'mid',
        autoMoon: true,
      })
    })

    it('cloudDensityLevelが0-5の範囲で設定できる', () => {
      service.updateWeatherConfig({ cloudDensityLevel: 5 })
      expect(service.weatherConfig.cloudDensityLevel).toBe(5)
      service.updateWeatherConfig({ cloudDensityLevel: 0 })
      expect(service.weatherConfig.cloudDensityLevel).toBe(0)
    })

    it('updateWeatherConfigで部分更新できる', () => {
      service.updateWeatherConfig({ weather: 'rainy' })
      expect(service.weatherConfig.weather).toBe('rainy')
      expect(service.weatherConfig.timeOfDay).toBe('day')
      expect(service.weatherConfig.autoTimeOfDay).toBe(false)
    })

    it('updateWeatherConfigで複数フィールドを同時更新できる', () => {
      service.updateWeatherConfig({ weather: 'rainy', timeOfDay: 'night', autoTimeOfDay: false })
      expect(service.weatherConfig).toMatchObject({
        weather: 'rainy',
        timeOfDay: 'night',
        autoWeather: false,
        autoTimeOfDay: false,
      })
    })

    it('cloudDensityLevel更新がイベントに反映される', () => {
      const received: SettingsEvent[] = []
      bus.subscribe<SettingsEvent>('WeatherConfigChanged', (event) => {
        received.push(event)
      })

      service.updateWeatherConfig({ cloudDensityLevel: 4 })

      expect(received).toHaveLength(1)
      if (received[0].type === 'WeatherConfigChanged') {
        expect(received[0].weather.cloudDensityLevel).toBe(4)
      }
    })

    it('updateWeatherConfigでWeatherConfigChangedイベントを発行する', () => {
      const received: SettingsEvent[] = []
      bus.subscribe<SettingsEvent>('WeatherConfigChanged', (event) => {
        received.push(event)
      })

      service.updateWeatherConfig({ weather: 'rainy' })

      expect(received).toHaveLength(1)
      expect(received[0].type).toBe('WeatherConfigChanged')
      if (received[0].type === 'WeatherConfigChanged') {
        expect(received[0].weather.weather).toBe('rainy')
      }
    })

    it('resetToDefaultでデフォルト天気設定に戻す', () => {
      service.updateWeatherConfig({ weather: 'rainy', autoTimeOfDay: false })
      service.resetToDefault()
      expect(service.weatherConfig).toEqual({
        weather: 'sunny',
        timeOfDay: 'day',
        autoWeather: false,
        autoTimeOfDay: false,
        autoKou: true,
        manualKouIndex: 0,
        cloudDensityLevel: 1,
        scenePreset: 'meadow',
        moonAltitude: 'mid',
        autoMoon: true,
      })
    })

    it('updateWeatherConfigでclimateフィールドを設定できる', () => {
      service.updateWeatherConfig({
        climate: {
          mode: 'preset',
          presetName: 'Tokyo',
          latitude: 35.68,
          longitude: 139.77,
          label: 'Tokyo',
        },
      })
      expect(service.weatherConfig.climate).toEqual({
        mode: 'preset',
        presetName: 'Tokyo',
        latitude: 35.68,
        longitude: 139.77,
        label: 'Tokyo',
      })
    })

    it('updateWeatherConfigでclimate未指定時はundefinedのまま', () => {
      service.updateWeatherConfig({ weather: 'rainy' })
      expect(service.weatherConfig.climate).toBeUndefined()
    })

    it('resetToDefaultでclimateフィールドがクリアされる', () => {
      service.updateWeatherConfig({
        climate: {
          mode: 'custom',
          latitude: 40,
          longitude: 140,
          label: 'Custom',
        },
      })
      service.resetToDefault()
      expect(service.weatherConfig.climate).toBeUndefined()
    })
  })

  describe('licenseSettings', () => {
    it('初期状態で全フィールドがnull', () => {
      expect(service.licenseSettings).toEqual({
        deviceId: null,
        downloadKey: null,
        jwt: null,
      })
    })

    it('resetToDefaultでlicenseSettingsは変更されない', () => {
      // licenseSettingsはメインプロセスで管理されるため、resetToDefaultの影響を受けない
      service.resetToDefault()
      expect(service.licenseSettings).toEqual({
        deviceId: null,
        downloadKey: null,
        jwt: null,
      })
    })
  })

  describe('characterConfig', () => {
    it('初期状態でデフォルト名Wildboarを保持する', () => {
      expect(service.characterConfig).toEqual({ name: 'Wildboar' })
    })

    it('updateCharacterConfigで名前を変更できる', () => {
      service.updateCharacterConfig({ name: 'Taro' })
      expect(service.characterConfig).toEqual({ name: 'Taro' })
    })

    it('updateCharacterConfigでCharacterConfigChangedイベントを発行する', () => {
      const received: SettingsEvent[] = []
      bus.subscribe<SettingsEvent>('CharacterConfigChanged', (event) => {
        received.push(event)
      })

      service.updateCharacterConfig({ name: 'Hanako' })

      expect(received).toHaveLength(1)
      expect(received[0].type).toBe('CharacterConfigChanged')
      if (received[0].type === 'CharacterConfigChanged') {
        expect(received[0].character.name).toBe('Hanako')
      }
    })

    it('resetToDefaultでデフォルト名に戻す', () => {
      service.updateCharacterConfig({ name: 'CustomName' })
      service.resetToDefault()
      expect(service.characterConfig).toEqual({ name: 'Wildboar' })
    })

    it('resetToDefaultでCharacterConfigChangedイベントを発行する', () => {
      service.updateCharacterConfig({ name: 'CustomName' })

      const received: SettingsEvent[] = []
      bus.subscribe<SettingsEvent>('CharacterConfigChanged', (event) => {
        received.push(event)
      })

      service.resetToDefault()

      expect(received).toHaveLength(1)
      if (received[0].type === 'CharacterConfigChanged') {
        expect(received[0].character.name).toBe('Wildboar')
      }
    })
  })

  describe('powerConfig', () => {
    it('初期状態でpreventSleep=true', () => {
      expect(service.powerConfig).toEqual({ preventSleep: true })
    })

    it('updatePowerConfigで値が更新される', () => {
      service.updatePowerConfig({ preventSleep: false })
      expect(service.powerConfig).toEqual({ preventSleep: false })
    })

    it('resetToDefaultでデフォルト値に戻す', () => {
      service.updatePowerConfig({ preventSleep: false })
      service.resetToDefault()
      expect(service.powerConfig).toEqual({ preventSleep: true })
    })
  })

  describe('loadFromStorage — theme復元', () => {
    beforeEach(() => {
      // window.electronAPI.loadSettingsをモック
      (globalThis as any).window = {
        electronAPI: {
          loadSettings: vi.fn(),
          saveSettings: vi.fn(),
        },
      }
    })

    afterEach(() => {
      delete (globalThis as any).window
    })

    it.each(['system', 'light', 'dark', 'auto'] as const)(
      'loadFromStorageで%sテーマを復元する',
      async (theme) => {
        ;(globalThis as any).window.electronAPI.loadSettings.mockResolvedValue({ theme })
        // loadFromStorageはwindow.electronAPI.loadSettingsの結果からテーマを復元する
        // 新しいserviceを作成（beforeEachのwindowモック後に）
        const svc = createAppSettingsService(bus)
        await svc.loadFromStorage()
        expect(svc.themePreference).toBe(theme)
      }
    )

    it('loadFromStorageでThemeLoadedイベントを発行する', async () => {
      ;(globalThis as any).window.electronAPI.loadSettings.mockResolvedValue({ theme: 'auto' })
      const received: SettingsEvent[] = []
      bus.subscribe<SettingsEvent>('ThemeLoaded', (event) => received.push(event))

      const svc = createAppSettingsService(bus)
      await svc.loadFromStorage()

      expect(received).toHaveLength(1)
      expect(received[0].type).toBe('ThemeLoaded')
      if (received[0].type === 'ThemeLoaded') {
        expect(received[0].theme).toBe('auto')
      }
    })

    it('loadFromStorageで無効なtheme値はデフォルトを保持する', async () => {
      ;(globalThis as any).window.electronAPI.loadSettings.mockResolvedValue({ theme: 'invalid' })
      const svc = createAppSettingsService(bus)
      await svc.loadFromStorage()
      expect(svc.themePreference).toBe('system')
    })

    it('loadFromStorageでtheme未設定時はデフォルトを保持する', async () => {
      ;(globalThis as any).window.electronAPI.loadSettings.mockResolvedValue({})
      const svc = createAppSettingsService(bus)
      await svc.loadFromStorage()
      expect(svc.themePreference).toBe('system')
    })

    it('loadFromStorageでthemeが文字列以外の場合はデフォルトを保持する', async () => {
      ;(globalThis as any).window.electronAPI.loadSettings.mockResolvedValue({ theme: 123 })
      const svc = createAppSettingsService(bus)
      await svc.loadFromStorage()
      expect(svc.themePreference).toBe('system')
    })

    it('loadFromStorageでdata=null時は何もしない', async () => {
      ;(globalThis as any).window.electronAPI.loadSettings.mockResolvedValue(null)
      const svc = createAppSettingsService(bus)
      await svc.loadFromStorage()
      expect(svc.themePreference).toBe('system')
    })
  })

  describe('themePreference', () => {
    it('初期状態で system を保持する', () => {
      expect(service.themePreference).toBe('system')
    })

    it('updateThemeConfig で light に変更できる', () => {
      service.updateThemeConfig('light')
      expect(service.themePreference).toBe('light')
    })

    it('updateThemeConfig で dark に変更できる', () => {
      service.updateThemeConfig('dark')
      expect(service.themePreference).toBe('dark')
    })

    it('updateThemeConfig で auto に変更できる', () => {
      service.updateThemeConfig('auto')
      expect(service.themePreference).toBe('auto')
    })

    it('resetToDefault で system に戻す', () => {
      service.updateThemeConfig('auto')
      service.resetToDefault()
      expect(service.themePreference).toBe('system')
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
