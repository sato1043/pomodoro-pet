import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import { createConfig, createDefaultConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { EventBus } from '../../domain/shared/EventBus'
import type { SettingsEvent, ThemePreference } from './SettingsEvents'

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

export interface AppSettingsService {
  readonly currentConfig: TimerConfig
  readonly themePreference: ThemePreference
  readonly backgroundConfig: BackgroundConfigInput
  loadFromStorage(): Promise<void>
  updateTimerConfig(input: TimerConfigInput): void
  updateSoundConfig(input: SoundConfigInput): void
  updateThemeConfig(theme: ThemePreference): void
  updateBackgroundConfig(input: BackgroundConfigInput): void
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
  background: BackgroundConfigInput
): void {
  if (typeof window !== 'undefined' && window.electronAPI?.saveSettings) {
    window.electronAPI.saveSettings({ timer, sound, theme, background })
  }
}

const DEFAULT_SOUND: SoundConfigInput = { preset: 'silence', volume: 0.5, isMuted: false }
const DEFAULT_THEME: ThemePreference = 'system'
const DEFAULT_BACKGROUND: BackgroundConfigInput = { backgroundAudio: true, backgroundNotify: true }

export function createAppSettingsService(
  bus: EventBus,
  initialConfig?: TimerConfig,
  debugTimer?: boolean
): AppSettingsService {
  let currentConfig: TimerConfig = initialConfig ?? createDefaultConfig()
  let currentSound: SoundConfigInput = { ...DEFAULT_SOUND }
  let currentTheme: ThemePreference = DEFAULT_THEME
  let currentBackground: BackgroundConfigInput = { ...DEFAULT_BACKGROUND }

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

  return {
    get currentConfig() { return currentConfig },
    get themePreference() { return currentTheme },
    get backgroundConfig() { return currentBackground },

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

      // タイマー設定の復元（SettingsChanged発行でTimerOverlay再作成。この時点でAudioAdapterは既に更新済み）
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
      saveAllToStorage(input, currentSound, currentTheme, currentBackground)
    },

    updateSoundConfig(input: SoundConfigInput): void {
      currentSound = input
      saveAllToStorage(configToInput(currentConfig), currentSound, currentTheme, currentBackground)
    },

    updateThemeConfig(theme: ThemePreference): void {
      currentTheme = theme
      saveAllToStorage(configToInput(currentConfig), currentSound, currentTheme, currentBackground)
    },

    updateBackgroundConfig(input: BackgroundConfigInput): void {
      currentBackground = input
      saveAllToStorage(configToInput(currentConfig), currentSound, currentTheme, currentBackground)
    },

    resetToDefault(): void {
      currentConfig = createDefaultConfig()
      currentSound = { ...DEFAULT_SOUND }
      currentTheme = DEFAULT_THEME
      currentBackground = { ...DEFAULT_BACKGROUND }
      publishSettingsChanged(currentConfig)
      saveAllToStorage(configToInput(currentConfig), currentSound, currentTheme, currentBackground)
    }
  }
}
