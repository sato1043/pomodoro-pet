import { useState, useEffect, useRef, useCallback } from 'react'
import type { TimerConfig } from '../../../domain/timer/value-objects/TimerConfig'
import { createConfig } from '../../../domain/timer/value-objects/TimerConfig'
import type { ThemePreference } from '../../../application/settings/SettingsEvents'
import { useAppDeps } from '../AppContext'
import { useTheme } from '../ThemeContext'

const WORK_OPTIONS = [25, 50, 90]
const BREAK_OPTIONS = [5, 10, 15]
const LONG_BREAK_OPTIONS = [15, 30, 60]
const SETS_OPTIONS = [1, 2, 3, 4]

export interface TimerSettings {
  work: number
  break: number
  longBreak: number
  sets: number
}

function resolveSelected(options: number[], selected: number): number {
  return options.includes(selected) ? selected : options[0]
}

function msToMinutes(ms: number): number {
  return Math.round(ms / 60000)
}

function settingsFromConfig(config: TimerConfig): TimerSettings {
  return {
    work: resolveSelected(WORK_OPTIONS, msToMinutes(config.workDurationMs)),
    break: resolveSelected(BREAK_OPTIONS, msToMinutes(config.breakDurationMs)),
    longBreak: resolveSelected(LONG_BREAK_OPTIONS, msToMinutes(config.longBreakDurationMs)),
    sets: resolveSelected(SETS_OPTIONS, config.setsPerCycle),
  }
}

function settingsToTimerConfig(s: TimerSettings): TimerConfig {
  return createConfig(s.work * 60000, s.break * 60000, s.longBreak * 60000, s.sets)
}

export interface SettingsEditorResult {
  settings: TimerSettings
  expanded: boolean
  volumeKey: number
  currentTimerConfig: TimerConfig
  toggle(): void
  confirm(): void
  updateSetting(key: keyof TimerSettings, value: number): void
  handleSoundChange(): void
}

export function useSettingsEditor(): SettingsEditorResult {
  const { config, settingsService, audio, sfx } = useAppDeps()
  const { themePreference, setThemePreference } = useTheme()

  const [settings, setSettings] = useState<TimerSettings>(() => settingsFromConfig(config))
  const [expanded, setExpanded] = useState(false)
  const [volumeKey, setVolumeKey] = useState(0)
  const snapshotRef = useRef<{
    settings: TimerSettings
    preset: string
    volume: number
    muted: boolean
    theme: ThemePreference
  } | null>(null)
  const confirmedRef = useRef(false)

  // config変更時にsettingsを同期
  useEffect(() => {
    setSettings(settingsFromConfig(config))
  }, [config])

  const currentTimerConfig = settingsToTimerConfig(settings)

  const toggle = useCallback(() => {
    setExpanded(prev => {
      if (!prev) {
        // 展開時: スナップショット保存
        snapshotRef.current = {
          settings: { ...settings },
          preset: audio.currentPreset,
          volume: audio.volume,
          muted: audio.isMuted,
          theme: themePreference,
        }
        confirmedRef.current = false
      } else if (!confirmedRef.current && snapshotRef.current) {
        // Setを押さずに閉じた: スナップショット復元
        const snap = snapshotRef.current
        setSettings(snap.settings)
        if (audio.currentPreset !== snap.preset) audio.switchPreset(snap.preset)
        if (audio.isMuted !== snap.muted) audio.toggleMute()
        audio.setVolume(snap.volume)
        sfx?.setVolume(snap.volume)
        sfx?.setMuted(snap.muted)
        setThemePreference(snap.theme)
        setVolumeKey(k => k + 1)
      }
      return !prev
    })
  }, [settings, audio, sfx, themePreference, setThemePreference])

  const confirm = useCallback(() => {
    settingsService.updateTimerConfig({
      workMinutes: settings.work,
      breakMinutes: settings.break,
      longBreakMinutes: settings.longBreak,
      setsPerCycle: settings.sets,
    })
    settingsService.updateSoundConfig({
      preset: audio.currentPreset,
      volume: audio.volume,
      isMuted: audio.isMuted,
    })
    settingsService.updateThemeConfig(themePreference)
    confirmedRef.current = true
    setExpanded(false)
  }, [settings, settingsService, audio, themePreference])

  const handleSoundChange = useCallback(() => {
    if (!expanded) {
      settingsService.updateSoundConfig({
        preset: audio.currentPreset,
        volume: audio.volume,
        isMuted: audio.isMuted,
      })
    }
    setVolumeKey(k => k + 1)
  }, [expanded, settingsService, audio])

  const updateSetting = useCallback((key: keyof TimerSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  return {
    settings,
    expanded,
    volumeKey,
    currentTimerConfig,
    toggle,
    confirm,
    updateSetting,
    handleSoundChange,
  }
}
