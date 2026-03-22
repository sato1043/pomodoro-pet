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
  volumeKey: number
  currentTimerConfig: TimerConfig
  backgroundAudio: boolean
  backgroundNotify: boolean
  preventSleep: boolean
  setBackgroundAudio(value: boolean): void
  setBackgroundNotify(value: boolean): void
  setPreventSleep(value: boolean): void
  openEditor(): void
  closeEditor(): void
  confirm(): void
  updateSetting(key: keyof TimerSettings, value: number): void
  handleSoundChange(isEditing: boolean): void
}

export function useSettingsEditor(): SettingsEditorResult {
  const { config, settingsService, audio, sfx } = useAppDeps()
  const { themePreference, setThemePreference } = useTheme()

  const [settings, setSettings] = useState<TimerSettings>(() => settingsFromConfig(config))
  const [volumeKey, setVolumeKey] = useState(0)
  const [backgroundAudio, setBackgroundAudio] = useState(() => settingsService.backgroundConfig.backgroundAudio)
  const [backgroundNotify, setBackgroundNotify] = useState(() => settingsService.backgroundConfig.backgroundNotify)
  const [preventSleep, setPreventSleep] = useState(() => settingsService.powerConfig.preventSleep)
  const snapshotRef = useRef<{
    settings: TimerSettings
    preset: string
    volume: number
    muted: boolean
    theme: ThemePreference
    backgroundAudio: boolean
    backgroundNotify: boolean
    preventSleep: boolean
  } | null>(null)
  const confirmedRef = useRef(false)

  // config変更時にsettingsを同期
  useEffect(() => {
    setSettings(settingsFromConfig(config))
  }, [config])

  const currentTimerConfig = settingsToTimerConfig(settings)

  const openEditor = useCallback(() => {
    snapshotRef.current = {
      settings: { ...settings },
      preset: audio.currentPreset,
      volume: audio.volume,
      muted: audio.isMuted,
      theme: themePreference,
      backgroundAudio,
      backgroundNotify,
      preventSleep,
    }
    confirmedRef.current = false
  }, [settings, audio, themePreference, backgroundAudio, backgroundNotify, preventSleep])

  const closeEditor = useCallback(() => {
    if (!confirmedRef.current && snapshotRef.current) {
      const snap = snapshotRef.current
      setSettings(snap.settings)
      if (audio.currentPreset !== snap.preset) audio.switchPreset(snap.preset)
      if (audio.isMuted !== snap.muted) audio.toggleMute()
      audio.setVolume(snap.volume)
      sfx?.setVolume(snap.volume)
      sfx?.setMuted(snap.muted)
      setThemePreference(snap.theme)
      setBackgroundAudio(snap.backgroundAudio)
      setBackgroundNotify(snap.backgroundNotify)
      setPreventSleep(snap.preventSleep)
      setVolumeKey(k => k + 1)
    }
  }, [audio, sfx, setThemePreference])

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
    settingsService.updateBackgroundConfig({ backgroundAudio, backgroundNotify })
    settingsService.updatePowerConfig({ preventSleep })
    confirmedRef.current = true
  }, [settings, settingsService, audio, themePreference, backgroundAudio, backgroundNotify, preventSleep])

  const handleSoundChange = useCallback((isEditing: boolean) => {
    if (!isEditing) {
      settingsService.updateSoundConfig({
        preset: audio.currentPreset,
        volume: audio.volume,
        isMuted: audio.isMuted,
      })
    }
    setVolumeKey(k => k + 1)
  }, [settingsService, audio])

  const updateSetting = useCallback((key: keyof TimerSettings, value: number) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  return {
    settings,
    volumeKey,
    currentTimerConfig,
    backgroundAudio,
    backgroundNotify,
    preventSleep,
    setBackgroundAudio,
    setBackgroundNotify,
    setPreventSleep,
    openEditor,
    closeEditor,
    confirm,
    updateSetting,
    handleSoundChange,
  }
}
