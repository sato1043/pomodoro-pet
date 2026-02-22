import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAppDeps } from './AppContext'
import { SetButton } from './SetButton'
import { resolveTimeOfDay, cloudPresetLevel } from '../../domain/environment/value-objects/WeatherConfig'
import type { WeatherType, TimeOfDay, WeatherConfig, CloudDensityLevel } from '../../domain/environment/value-objects/WeatherConfig'
import type { SettingsEvent } from '../../application/settings/SettingsEvents'
import * as styles from './styles/weather-panel.css'

// --- SVG アイコン (18x18) ---

function SunnyIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function CloudyIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
    </svg>
  )
}

function RainyIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      <line x1="8" y1="19" x2="8" y2="21" />
      <line x1="12" y1="19" x2="12" y2="21" />
      <line x1="16" y1="19" x2="16" y2="21" />
    </svg>
  )
}

function SnowyIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
      <line x1="8" y1="20" x2="8.5" y2="22" />
      <line x1="12" y1="20" x2="12" y2="22" />
      <line x1="16" y1="20" x2="15.5" y2="22" />
    </svg>
  )
}

function MorningIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 18a5 5 0 0 0-10 0" />
      <line x1="12" y1="9" x2="12" y2="7" />
      <line x1="7.05" y1="13.05" x2="5.64" y2="11.64" />
      <line x1="16.95" y1="13.05" x2="18.36" y2="11.64" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function DayIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function EveningIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 18a5 5 0 0 0-10 0" />
      <line x1="12" y1="13" x2="12" y2="11" />
      <line x1="8" y1="14.5" x2="7" y2="13.5" />
      <line x1="16" y1="14.5" x2="17" y2="13.5" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function NightIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function AutoIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function ResetIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
    </svg>
  )
}

// --- 定義 ---

const WEATHER_OPTIONS: Array<{ value: WeatherType; icon: () => JSX.Element; enabled: boolean; title: string }> = [
  { value: 'sunny', icon: SunnyIcon, enabled: true, title: 'Sunny' },
  { value: 'cloudy', icon: CloudyIcon, enabled: true, title: 'Cloudy' },
  { value: 'rainy', icon: RainyIcon, enabled: true, title: 'Rainy' },
  { value: 'snowy', icon: SnowyIcon, enabled: true, title: 'Snowy' },
]

const TIME_OPTIONS: Array<{ value: TimeOfDay; icon: () => JSX.Element; title: string }> = [
  { value: 'morning', icon: MorningIcon, title: 'Morning' },
  { value: 'day', icon: DayIcon, title: 'Day' },
  { value: 'evening', icon: EveningIcon, title: 'Evening' },
  { value: 'night', icon: NightIcon, title: 'Night' },
]

// --- コンポーネント ---

interface WeatherPanelProps {
  readonly onClose: () => void
}

export function WeatherPanel({ onClose }: WeatherPanelProps): JSX.Element {
  const { settingsService, bus } = useAppDeps()

  const snapshotRef = useRef<WeatherConfig>(settingsService.weatherConfig)
  const [draft, setDraft] = useState<WeatherConfig>(() => settingsService.weatherConfig)
  const confirmedRef = useRef(false)

  function publishPreview(next: WeatherConfig): void {
    const event: SettingsEvent = {
      type: 'WeatherConfigChanged',
      weather: next,
      timestamp: Date.now(),
    }
    bus.publish(event.type, event)
  }

  function updateDraft(partial: Partial<WeatherConfig>): void {
    setDraft(prev => {
      const next = { ...prev, ...partial }
      publishPreview(next)
      return next
    })
  }

  function handleConfirm(): void {
    settingsService.updateWeatherConfig(draft)
    confirmedRef.current = true
    onClose()
  }

  // マウント時: カメラ後退、アンマウント時: スナップショット復元 + カメラ復帰
  useEffect(() => {
    bus.publish('WeatherPreviewOpen', { open: true })
    return () => {
      if (!confirmedRef.current) {
        const snap = snapshotRef.current
        const event: SettingsEvent = {
          type: 'WeatherConfigChanged',
          weather: snap,
          timestamp: Date.now(),
        }
        bus.publish(event.type, event)
      }
      bus.publish('WeatherPreviewOpen', { open: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function btnClass(active: boolean, disabled?: boolean): string {
    let cls = styles.iconBtn
    if (active) cls += ' active'
    if (disabled) cls += ' ' + styles.iconBtnDisabled
    return cls
  }

  return createPortal(
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Weather</span>
        {WEATHER_OPTIONS.map(opt => {
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              className={btnClass(draft.weather === opt.value && opt.enabled, !opt.enabled)}
              onClick={() => { if (opt.enabled) { updateDraft({ weather: opt.value, cloudDensityLevel: cloudPresetLevel(opt.value) }) } }}
              disabled={!opt.enabled}
              title={opt.title}
              data-testid={`weather-${opt.value}`}
            >
              <Icon />
            </button>
          )
        })}
        <button
          className={btnClass(draft.autoWeather, true)}
          disabled
          title="Auto (Coming soon)"
          data-testid="weather-auto"
        >
          A
        </button>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Clouds</span>
        <button
          className={styles.resetBtn}
          onClick={() => updateDraft({ cloudDensityLevel: cloudPresetLevel(draft.weather) })}
          title="Reset to preset"
          data-testid="cloud-reset"
        >
          <ResetIcon />
        </button>
        {([0, 1, 2, 3, 4, 5] as const).map(level => (
          <span
            key={level}
            className={`${styles.cloudSeg}${level <= draft.cloudDensityLevel ? ' on' : ''}`}
            onClick={() => updateDraft({ cloudDensityLevel: level })}
            data-testid={`cloud-level-${level}`}
          />
        ))}
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Time</span>
        {TIME_OPTIONS.map(opt => {
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              className={btnClass(!draft.autoTimeOfDay && draft.timeOfDay === opt.value)}
              onClick={() => updateDraft({ timeOfDay: opt.value, autoTimeOfDay: false })}
              title={opt.title}
              data-testid={`time-${opt.value}`}
            >
              <Icon />
            </button>
          )
        })}
        <button
          className={btnClass(draft.autoTimeOfDay)}
          onClick={() => updateDraft({ autoTimeOfDay: true })}
          title={`Auto (${resolveTimeOfDay(new Date().getHours())})`}
          data-testid="time-auto"
        >
          <AutoIcon />
        </button>
      </div>

      <SetButton onClick={handleConfirm} />
    </div>,
    document.body
  )
}
