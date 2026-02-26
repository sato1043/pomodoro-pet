import { useState, useRef, useCallback } from 'react'
import { useLicenseMode } from './LicenseContext'
import { OverlayFree } from './OverlayFree'
import { FureaiEntryButton } from './FureaiEntryButton'
import { StartPomodoroButton } from './StartPomodoroButton'
import { StatsButton } from './StatsButton'
import { SettingsButton } from './SettingsButton'
import { SettingsCloseButton } from './SettingsCloseButton'
import { StatsCloseButton } from './StatsCloseButton'
import { StatsDrawer } from './StatsDrawer'
import { WeatherButton } from './WeatherButton'
import { WeatherCloseButton } from './WeatherCloseButton'
import { WeatherPanel } from './WeatherPanel'

export function SceneFree(): JSX.Element {
  const { canUse } = useLicenseMode()
  const [showStats, setShowStats] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [showWeather, setShowWeather] = useState(false)
  const toggleSettingsRef = useRef<() => void>(() => {})
  const hideButtons = showStats || settingsExpanded || showWeather

  const handleToggleRef = useCallback((toggle: () => void) => {
    toggleSettingsRef.current = toggle
  }, [])

  return (
    <>
      {!showStats && !showWeather && (
        <OverlayFree
          expanded={settingsExpanded}
          onExpandedChange={setSettingsExpanded}
          onToggleRef={handleToggleRef}
        />
      )}
      {showStats && <StatsDrawer onClose={() => setShowStats(false)} />}
      {showStats && <StatsCloseButton onClick={() => setShowStats(false)} />}
      {showWeather && <WeatherPanel onClose={() => setShowWeather(false)} />}
      {showWeather && <WeatherCloseButton onClick={() => setShowWeather(false)} />}
      {!hideButtons && <StartPomodoroButton />}
      {!hideButtons && canUse('stats') && <StatsButton onClick={() => setShowStats(true)} />}
      {!hideButtons && <SettingsButton onClick={() => toggleSettingsRef.current()} />}
      {settingsExpanded && <SettingsCloseButton onClick={() => toggleSettingsRef.current()} />}
      {!hideButtons && canUse('fureai') && <FureaiEntryButton />}
      {!hideButtons && canUse('weatherSettings') && <WeatherButton onClick={() => setShowWeather(true)} />}
    </>
  )
}
