import { useState, useRef, useCallback } from 'react'
import { useLicenseMode } from './LicenseContext'
import { useAppDeps } from './AppContext'
import { useEnvironment } from './EnvironmentContext'
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
import { GalleryEntryButton } from './GalleryEntryButton'
import { FeatureLockedOverlay } from './FeatureLockedOverlay'
import { LocationButton } from './LocationButton'
import { WorldMapModal } from './WorldMapModal'
import { KouDisplay } from './KouDisplay'
import coastlineData from '../../../assets/data/coastline-path.json'

export function SceneFree(): JSX.Element {
  const { canUse } = useLicenseMode()
  const { fureaiCoordinator, galleryCoordinator, climateGridPort } = useAppDeps()
  const { climate, currentKou, timezone, updateClimate } = useEnvironment()
  const [showStats, setShowStats] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [showWeather, setShowWeather] = useState(false)
  const [showLocked, setShowLocked] = useState(false)
  const [showWorldMap, setShowWorldMap] = useState(false)
  const toggleSettingsRef = useRef<() => void>(() => {})
  const hideButtons = showStats || settingsExpanded || showWeather

  const handleToggleRef = useCallback((toggle: () => void) => {
    toggleSettingsRef.current = toggle
  }, [])

  const handleFureaiClick = (): void => {
    if (canUse('fureai')) {
      fureaiCoordinator.enterFureai()
    } else {
      setShowLocked(true)
    }
  }

  const handleGalleryClick = (): void => {
    if (canUse('gallery')) {
      galleryCoordinator.enterGallery()
    } else {
      setShowLocked(true)
    }
  }

  return (
    <>
      {!showStats && !showWeather && (
        <OverlayFree
          expanded={settingsExpanded}
          onExpandedChange={setSettingsExpanded}
          onToggleRef={handleToggleRef}
          timezone={timezone}
        />
      )}
      {showStats && <StatsDrawer onClose={() => setShowStats(false)} />}
      {showStats && <StatsCloseButton onClick={() => setShowStats(false)} />}
      {showWeather && <WeatherPanel />}
      {showWeather && <WeatherCloseButton onClick={() => setShowWeather(false)} />}
      {!hideButtons && <StartPomodoroButton />}
      {!hideButtons && canUse('stats') && <StatsButton onClick={() => setShowStats(true)} />}
      {!hideButtons && <SettingsButton onClick={() => toggleSettingsRef.current()} />}
      {settingsExpanded && <SettingsCloseButton onClick={() => toggleSettingsRef.current()} />}
      {!hideButtons && <FureaiEntryButton onClick={handleFureaiClick} />}
      {!hideButtons && <LocationButton
        onClick={() => setShowWorldMap(true)}
        label={climate.label}
      />}
      {!hideButtons && canUse('weatherSettings') && <WeatherButton onClick={() => setShowWeather(true)} />}
      {!hideButtons && <GalleryEntryButton onClick={handleGalleryClick} />}
      {showWorldMap && (
        <WorldMapModal
          isOpen={showWorldMap}
          currentClimate={climate}
          coastlinePath={(coastlineData as { path: string; idlPath: string }).path}
          idlPath={(coastlineData as { path: string; idlPath: string }).idlPath}
          onClose={() => setShowWorldMap(false)}
          onApply={updateClimate}
          getMonthlyClimate={climateGridPort.isLoaded ? climateGridPort.getMonthlyClimate : undefined}
        />
      )}
      {showLocked && <FeatureLockedOverlay onDismiss={() => setShowLocked(false)} />}
      <KouDisplay kou={currentKou} visible={currentKou !== null && !hideButtons} />
    </>
  )
}
