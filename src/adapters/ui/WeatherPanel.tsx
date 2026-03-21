import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppDeps } from './AppContext'
import { resolveTimeOfDay, cloudPresetLevel } from '../../domain/environment/value-objects/WeatherConfig'
import type { WeatherType, TimeOfDay, MoonAltitude, WeatherConfig } from '../../domain/environment/value-objects/WeatherConfig'
import type { ScenePresetName } from '../../domain/environment/value-objects/ScenePreset'
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
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="3.34" y1="7" x2="20.66" y2="17" />
      <line x1="20.66" y1="7" x2="3.34" y2="17" />
      <polyline points="14,3.5 12,5 10,3.5" />
      <polyline points="14,20.5 12,19 10,20.5" />
      <polyline points="4.5,5.5 5.5,7.8 3.5,8.5" />
      <polyline points="19.5,18.5 18.5,16.2 20.5,15.5" />
      <polyline points="20.5,8.5 18.5,7.8 19.5,5.5" />
      <polyline points="3.5,15.5 5.5,16.2 4.5,18.5" />
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

// --- Scene プリセットアイコン ---

function MeadowIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20 L12 4 L21 20 Z" />
      <line x1="3" y1="20" x2="21" y2="20" />
    </svg>
  )
}

function SeasideIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <circle cx="17" cy="7" r="4" />
    </svg>
  )
}

function ParkIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="22" x2="12" y2="12" />
      <circle cx="12" cy="8" r="5" />
      <line x1="3" y1="22" x2="21" y2="22" />
    </svg>
  )
}

const SCENE_OPTIONS: Array<{ value: ScenePresetName; icon: () => JSX.Element; title: string }> = [
  { value: 'meadow', icon: MeadowIcon, title: 'Meadow' },
  { value: 'seaside', icon: SeasideIcon, title: 'Seaside' },
  { value: 'park', icon: ParkIcon, title: 'Park' },
]

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

// --- 月高度アイコン ---

function MoonHorizonIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 18.79A9 9 0 1 1 11.21 9 7 7 0 0 0 21 18.79z" />
      <line x1="1" y1="21" x2="23" y2="21" opacity="0.4" />
    </svg>
  )
}

function MoonLowIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16.79A9 9 0 1 1 11.21 7 7 7 0 0 0 21 16.79z" />
      <line x1="1" y1="21" x2="23" y2="21" opacity="0.4" />
    </svg>
  )
}

function MoonMidIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function MoonHighIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8.79A9 9 0 1 1 11.21 -1 7 7 0 0 0 21 8.79z" />
    </svg>
  )
}

const MOON_OPTIONS: Array<{ value: MoonAltitude; icon: () => JSX.Element; title: string }> = [
  { value: 'horizon', icon: MoonHorizonIcon, title: 'Horizon' },
  { value: 'low', icon: MoonLowIcon, title: 'Low' },
  { value: 'mid', icon: MoonMidIcon, title: 'Mid' },
  { value: 'high', icon: MoonHighIcon, title: 'High' },
]

// --- コンポーネント ---

function LocationIcon(): JSX.Element {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

interface WeatherPanelProps {
  readonly onLocationClick?: () => void
}

export function WeatherPanel({ onLocationClick }: WeatherPanelProps): JSX.Element {
  const { settingsService, bus } = useAppDeps()

  const [draft, setDraft] = useState<WeatherConfig>(() => settingsService.weatherConfig)

  function applyConfig(next: WeatherConfig): void {
    bus.publish('WeatherConfigChanged', {
      type: 'WeatherConfigChanged',
      weather: next,
      timestamp: Date.now(),
    })
    settingsService.updateWeatherConfig(next)
  }

  function updateDraft(partial: Partial<WeatherConfig>): void {
    setDraft(prev => {
      const next = { ...prev, ...partial }
      applyConfig(next)
      return next
    })
  }

  function btnClass(active: boolean, disabled?: boolean): string {
    let cls = styles.iconBtn
    if (active) cls += ' active'
    if (disabled) cls += ' ' + styles.iconBtnDisabled
    return cls
  }

  return (<>
    {createPortal(
    <div className={styles.panel}>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Scene</span>
        {SCENE_OPTIONS.map(opt => {
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              className={btnClass(draft.scenePreset === opt.value)}
              onClick={() => updateDraft({ scenePreset: opt.value })}
              title={opt.title}
              data-testid={`scene-${opt.value}`}
            >
              <Icon />
            </button>
          )
        })}
        {onLocationClick && (
          <button
            className={styles.locationBtn}
            onClick={onLocationClick}
            title="Location"
            data-testid="weather-location"
          >
            <LocationIcon />
          </button>
        )}
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Weather</span>
        {WEATHER_OPTIONS.map(opt => {
          const Icon = opt.icon
          const isDisabled = !opt.enabled
          return (
            <button
              key={opt.value}
              className={btnClass(!draft.autoWeather && draft.weather === opt.value && opt.enabled, isDisabled)}
              onClick={() => { if (!isDisabled) { updateDraft({ weather: opt.value, autoWeather: false, cloudDensityLevel: cloudPresetLevel(opt.value) }) } }}
              disabled={isDisabled}
              title={opt.title}
              data-testid={`weather-${opt.value}`}
            >
              <Icon />
            </button>
          )
        })}
        <button
          className={btnClass(draft.autoWeather)}
          onClick={() => updateDraft({ autoWeather: true })}
          title="Auto Weather"
          data-testid="weather-auto"
        >
          A
        </button>
      </div>

      <div className={styles.row}>
        <span className={styles.rowLabel}>Clouds</span>
        <button
          className={`${styles.resetBtn}${draft.autoWeather ? ' ' + styles.iconBtnDisabled : ''}`}
          onClick={() => { if (!draft.autoWeather) updateDraft({ cloudDensityLevel: cloudPresetLevel(draft.weather) }) }}
          disabled={draft.autoWeather}
          title="Reset to preset"
          data-testid="cloud-reset"
        >
          <ResetIcon />
        </button>
        {([0, 1, 2, 3, 4, 5] as const).map(level => (
          <span
            key={level}
            className={`${styles.cloudSeg}${level <= draft.cloudDensityLevel ? ' on' : ''}${draft.autoWeather ? ' ' + styles.iconBtnDisabled : ''}`}
            style={level <= draft.cloudDensityLevel ? { opacity: 0.15 + level * 0.17 } : undefined}
            onClick={() => { if (!draft.autoWeather) updateDraft({ cloudDensityLevel: level }) }}
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

      <div className={styles.row}>
        <span className={styles.rowLabel}>Moon</span>
        {MOON_OPTIONS.map(opt => {
          const Icon = opt.icon
          return (
            <button
              key={opt.value}
              className={btnClass(!draft.autoMoon && draft.moonAltitude === opt.value)}
              onClick={() => updateDraft({ moonAltitude: opt.value, autoMoon: false })}
              title={opt.title}
              data-testid={`moon-${opt.value}`}
            >
              <Icon />
            </button>
          )
        })}
        <button
          className={btnClass(draft.autoMoon)}
          onClick={() => updateDraft({ autoMoon: true })}
          title="Auto"
          data-testid="moon-auto"
        >
          <AutoIcon />
        </button>
      </div>

    </div>,
    document.body
  )}
  </>)
}
