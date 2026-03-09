import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import { createConfig, createDefaultConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { EventBus } from '../../domain/shared/EventBus'
import type { SettingsEvent, ThemePreference } from './SettingsEvents'
import type { WeatherConfig } from '../../domain/environment/value-objects/WeatherConfig'
import { createDefaultWeatherConfig } from '../../domain/environment/value-objects/WeatherConfig'

export interface TimerConfigInput {
  readonly workMinutes: number
  readonly breakMinutes: number
  readonly longBreakMinutes: number
  readonly setsPerCycle: number
}

export interface SoundConfigInput {
  readonly preset: string
  readonly volume: number
  readonly isMuted: boolean
}

export interface BackgroundConfigInput {
  readonly backgroundAudio: boolean
  readonly backgroundNotify: boolean
}

export interface EmotionConfigInput {
  readonly affinity: number
}

export interface CharacterConfigInput {
  readonly name: string
}

export interface LicenseSettingsInput {
  readonly deviceId: string | null
  readonly downloadKey: string | null
  readonly jwt: string | null
}

export interface PowerConfigInput {
  readonly preventSleep: boolean
}

export interface BiorhythmConfigInput {
  readonly originDay: number
}

export interface AppSettingsService {
  readonly currentConfig: TimerConfig
  readonly themePreference: ThemePreference
  readonly backgroundConfig: BackgroundConfigInput
  readonly powerConfig: PowerConfigInput
  readonly weatherConfig: WeatherConfig
  readonly emotionConfig: EmotionConfigInput
  readonly characterConfig: CharacterConfigInput
  readonly licenseSettings: LicenseSettingsInput
  readonly biorhythmConfig: BiorhythmConfigInput
  loadFromStorage(): Promise<void>
  updateTimerConfig(input: TimerConfigInput): void
  updateSoundConfig(input: SoundConfigInput): void
  updateThemeConfig(theme: ThemePreference): void
  updateBackgroundConfig(input: BackgroundConfigInput): void
  updatePowerConfig(input: PowerConfigInput): void
  updateWeatherConfig(partial: Partial<WeatherConfig>): void
  updateEmotionConfig(input: EmotionConfigInput): void
  updateCharacterConfig(input: CharacterConfigInput): void
  updateBiorhythmConfig(input: BiorhythmConfigInput): void
  resetToDefault(): void
}

function configToInput(config: TimerConfig): TimerConfigInput {
  return {
    workMinutes: Math.round(config.workDurationMs / 60000),
    breakMinutes: Math.round(config.breakDurationMs / 60000),
    longBreakMinutes: Math.round(config.longBreakDurationMs / 60000),
    setsPerCycle: config.setsPerCycle
  }
}

function loadStoredData(): Promise<Record<string, unknown> | null> {
  if (typeof window === 'undefined' || !window.electronAPI?.loadSettings) return Promise.resolve(null)
  return window.electronAPI.loadSettings()
}

function saveAllToStorage(
  timer: TimerConfigInput,
  sound: SoundConfigInput,
  theme: ThemePreference,
  background: BackgroundConfigInput,
  power: PowerConfigInput,
  weather: WeatherConfig,
  emotion: EmotionConfigInput,
  character: CharacterConfigInput,
  biorhythm: BiorhythmConfigInput
): void {
  if (typeof window !== 'undefined' && window.electronAPI?.saveSettings) {
    window.electronAPI.saveSettings({ timer, sound, theme, background, power, weather, emotion, character, biorhythm })
  }
}

const DEFAULT_SOUND: SoundConfigInput = { preset: 'silence', volume: 0.5, isMuted: false }
const DEFAULT_THEME: ThemePreference = 'system'
const DEFAULT_BACKGROUND: BackgroundConfigInput = { backgroundAudio: true, backgroundNotify: true }
const DEFAULT_POWER: PowerConfigInput = { preventSleep: true }
const DEFAULT_WEATHER: WeatherConfig = createDefaultWeatherConfig()
const DEFAULT_EMOTION: EmotionConfigInput = { affinity: 0 }
const DEFAULT_CHARACTER: CharacterConfigInput = { name: 'Wildboar' }
const DEFAULT_LICENSE: LicenseSettingsInput = { deviceId: null, downloadKey: null, jwt: null }
const DEFAULT_BIORHYTHM: BiorhythmConfigInput = { originDay: Date.now() }

export function createAppSettingsService(
  bus: EventBus,
  initialConfig?: TimerConfig,
  debugTimer?: boolean
): AppSettingsService {
  let currentConfig: TimerConfig = initialConfig ?? createDefaultConfig()
  let currentSound: SoundConfigInput = { ...DEFAULT_SOUND }
  let currentTheme: ThemePreference = DEFAULT_THEME
  let currentBackground: BackgroundConfigInput = { ...DEFAULT_BACKGROUND }
  let currentPower: PowerConfigInput = { ...DEFAULT_POWER }
  let currentWeather: WeatherConfig = { ...DEFAULT_WEATHER }
  let currentEmotion: EmotionConfigInput = { ...DEFAULT_EMOTION }
  let currentCharacter: CharacterConfigInput = { ...DEFAULT_CHARACTER }
  let currentLicense: LicenseSettingsInput = { ...DEFAULT_LICENSE }
  let currentBiorhythm: BiorhythmConfigInput = { ...DEFAULT_BIORHYTHM }

  function publishSettingsChanged(config: TimerConfig): void {
    const event: SettingsEvent = {
      type: 'SettingsChanged',
      config,
      timestamp: Date.now()
    }
    bus.publish(event.type, event)
  }

  function publishSoundLoaded(sound: SoundConfigInput): void {
    const event: SettingsEvent = {
      type: 'SoundSettingsLoaded',
      sound,
      timestamp: Date.now()
    }
    bus.publish(event.type, event)
  }

  function publishThemeLoaded(theme: ThemePreference): void {
    const event: SettingsEvent = {
      type: 'ThemeLoaded',
      theme,
      timestamp: Date.now()
    }
    bus.publish(event.type, event)
  }

  function publishBackgroundLoaded(background: BackgroundConfigInput): void {
    const event: SettingsEvent = {
      type: 'BackgroundSettingsLoaded',
      background,
      timestamp: Date.now()
    }
    bus.publish(event.type, event)
  }

  function publishWeatherChanged(weather: WeatherConfig): void {
    const event: SettingsEvent = {
      type: 'WeatherConfigChanged',
      weather,
      timestamp: Date.now()
    }
    bus.publish(event.type, event)
  }

  function publishCharacterConfigChanged(character: CharacterConfigInput): void {
    const event: SettingsEvent = {
      type: 'CharacterConfigChanged',
      character,
      timestamp: Date.now()
    }
    bus.publish(event.type, event)
  }

  function save(): void {
    saveAllToStorage(configToInput(currentConfig), currentSound, currentTheme, currentBackground, currentPower, currentWeather, currentEmotion, currentCharacter, currentBiorhythm)
  }

  return {
    get currentConfig() { return currentConfig },
    get themePreference() { return currentTheme },
    get backgroundConfig() { return currentBackground },
    get powerConfig() { return currentPower },
    get weatherConfig() { return currentWeather },
    get emotionConfig() { return currentEmotion },
    get characterConfig() { return currentCharacter },
    get licenseSettings() { return currentLicense },
    get biorhythmConfig() { return currentBiorhythm },

    async loadFromStorage(): Promise<void> {
      const data = await loadStoredData()
      if (!data) return

      // テーマ設定の復元（最初に実行。UIレンダリング前にテーマクラスを適用するため）
      if (typeof data.theme === 'string' && ['system', 'light', 'dark'].includes(data.theme)) {
        currentTheme = data.theme as ThemePreference
        publishThemeLoaded(currentTheme)
      }

      // サウンド設定の復元（先に実行。SettingsChangedでUI再作成される前にAudioAdapterを更新するため）
      if (data.sound) {
        const s = data.sound as Record<string, unknown>
        if (
          typeof s.preset === 'string' &&
          typeof s.volume === 'number' &&
          typeof s.isMuted === 'boolean'
        ) {
          currentSound = { preset: s.preset, volume: s.volume, isMuted: s.isMuted }
          publishSoundLoaded(currentSound)
        }
      }

      // バックグラウンド設定の復元
      if (data.background) {
        const bg = data.background as Record<string, unknown>
        if (
          typeof bg.backgroundAudio === 'boolean' &&
          typeof bg.backgroundNotify === 'boolean'
        ) {
          currentBackground = { backgroundAudio: bg.backgroundAudio, backgroundNotify: bg.backgroundNotify }
          publishBackgroundLoaded(currentBackground)
        }
      }

      // 電源設定の復元
      if (data.power) {
        const pw = data.power as Record<string, unknown>
        if (typeof pw.preventSleep === 'boolean') {
          currentPower = { preventSleep: pw.preventSleep }
        }
      }

      // 天気設定の復元
      if (data.weather) {
        const w = data.weather as Record<string, unknown>
        if (typeof w.weather === 'string' && typeof w.timeOfDay === 'string') {
          const validPresets = ['meadow', 'seaside', 'park']
          // climate フィールドの復元（後方互換: 未設定時はundefined→DEFAULT_CLIMATEにフォールバック）
          let restoredClimate: WeatherConfig['climate'] = undefined
          if (w.climate && typeof w.climate === 'object') {
            const c = w.climate as Record<string, unknown>
            if (typeof c.latitude === 'number' && typeof c.longitude === 'number' && typeof c.label === 'string') {
              restoredClimate = {
                mode: c.mode === 'custom' ? 'custom' : 'preset',
                presetName: typeof c.presetName === 'string' ? c.presetName : undefined,
                latitude: c.latitude,
                longitude: c.longitude,
                label: c.label,
              }
            }
          }
          currentWeather = {
            weather: w.weather as WeatherConfig['weather'],
            timeOfDay: w.timeOfDay as WeatherConfig['timeOfDay'],
            autoWeather: typeof w.autoWeather === 'boolean' ? w.autoWeather : false,
            autoTimeOfDay: typeof w.autoTimeOfDay === 'boolean' ? w.autoTimeOfDay : true,
            cloudDensityLevel: typeof w.cloudDensityLevel === 'number' ? w.cloudDensityLevel as WeatherConfig['cloudDensityLevel'] : DEFAULT_WEATHER.cloudDensityLevel,
            scenePreset: typeof w.scenePreset === 'string' && validPresets.includes(w.scenePreset)
              ? w.scenePreset as WeatherConfig['scenePreset']
              : 'meadow',
            climate: restoredClimate,
          }
          publishWeatherChanged(currentWeather)
        }
      }

      // 感情設定の復元（affinityのみ永続化）
      if (data.emotion) {
        const em = data.emotion as Record<string, unknown>
        if (typeof em.affinity === 'number') {
          currentEmotion = { affinity: em.affinity }
        }
      }

      // キャラクター設定の復元
      if (data.character) {
        const ch = data.character as Record<string, unknown>
        if (typeof ch.name === 'string' && ch.name.length > 0) {
          currentCharacter = { name: ch.name }
          publishCharacterConfigChanged(currentCharacter)
        }
      }

      // バイオリズム設定の復元（originDay）
      if (data.biorhythm) {
        const br = data.biorhythm as Record<string, unknown>
        if (typeof br.originDay === 'number') {
          currentBiorhythm = { originDay: br.originDay }
        }
      }

      // ライセンス設定の復元（deviceId/downloadKey/jwtはメインプロセスで管理、読み取り専用）
      const deviceId = typeof data.deviceId === 'string' ? data.deviceId : null
      const downloadKey = typeof data.downloadKey === 'string' ? data.downloadKey : null
      const jwt = typeof data.jwt === 'string' ? data.jwt : null
      currentLicense = { deviceId, downloadKey, jwt }

      // タイマー設定の復元（SettingsChanged発行でUI再作成。この時点でAudioAdapterは既に更新済み）
      // デバッグタイマー有効時はデバッグ値を優先し、保存済みタイマー設定をスキップ
      if (data.timer && !debugTimer) {
        const t = data.timer as Record<string, unknown>
        if (
          typeof t.workMinutes === 'number' &&
          typeof t.breakMinutes === 'number' &&
          typeof t.longBreakMinutes === 'number' &&
          typeof t.setsPerCycle === 'number'
        ) {
          const config = createConfig(
            t.workMinutes * 60000,
            t.breakMinutes * 60000,
            t.longBreakMinutes * 60000,
            t.setsPerCycle
          )
          currentConfig = config
          publishSettingsChanged(config)
        }
      }
    },

    updateTimerConfig(input: TimerConfigInput): void {
      const config = createConfig(
        input.workMinutes * 60 * 1000,
        input.breakMinutes * 60 * 1000,
        input.longBreakMinutes * 60 * 1000,
        input.setsPerCycle
      )
      currentConfig = config
      publishSettingsChanged(config)
      save()
    },

    updateSoundConfig(input: SoundConfigInput): void {
      currentSound = input
      save()
    },

    updateThemeConfig(theme: ThemePreference): void {
      currentTheme = theme
      save()
    },

    updateBackgroundConfig(input: BackgroundConfigInput): void {
      currentBackground = input
      save()
    },

    updatePowerConfig(input: PowerConfigInput): void {
      currentPower = input
      save()
    },

    updateWeatherConfig(partial: Partial<WeatherConfig>): void {
      currentWeather = { ...currentWeather, ...partial }
      publishWeatherChanged(currentWeather)
      save()
    },

    updateEmotionConfig(input: EmotionConfigInput): void {
      currentEmotion = input
      save()
    },

    updateCharacterConfig(input: CharacterConfigInput): void {
      currentCharacter = input
      publishCharacterConfigChanged(currentCharacter)
      save()
    },

    updateBiorhythmConfig(input: BiorhythmConfigInput): void {
      currentBiorhythm = input
      save()
    },

    resetToDefault(): void {
      currentConfig = createDefaultConfig()
      currentSound = { ...DEFAULT_SOUND }
      currentTheme = DEFAULT_THEME
      currentBackground = { ...DEFAULT_BACKGROUND }
      currentPower = { ...DEFAULT_POWER }
      currentWeather = { ...DEFAULT_WEATHER }
      currentEmotion = { ...DEFAULT_EMOTION }
      currentCharacter = { ...DEFAULT_CHARACTER }
      publishSettingsChanged(currentConfig)
      publishCharacterConfigChanged(currentCharacter)
      save()
    }
  }
}
