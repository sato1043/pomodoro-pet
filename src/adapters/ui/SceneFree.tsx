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
import { GalleryEntryButton } from './GalleryEntryButton'
import { FeatureLockedOverlay } from './FeatureLockedOverlay'

export function SceneFree(): JSX.Element {
  const { canUse } = useLicenseMode()
  const { fureaiCoordinator, galleryCoordinator, environmentCoordinator } = useAppDeps()
  const { timezone, currentKou } = useEnvironment()
  const [showStats, setShowStats] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [showLocked, setShowLocked] = useState(false)
  const toggleSettingsRef = useRef<() => void>(() => {})
  const hideButtons = showStats || settingsExpanded

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

  const handleEnvironmentClick = (): void => {
    if (canUse('weatherSettings')) {
      environmentCoordinator.enterEnvironment()
    } else {
      setShowLocked(true)
    }
  }

  return (
    <>
      {!showStats && (
        <OverlayFree
          expanded={settingsExpanded}
          onExpandedChange={setSettingsExpanded}
          onToggleRef={handleToggleRef}
          timezone={timezone}
          currentKou={currentKou}
        />
      )}
      {showStats && <StatsDrawer onClose={() => setShowStats(false)} />}
      {showStats && <StatsCloseButton onClick={() => setShowStats(false)} />}
      {!hideButtons && <StartPomodoroButton />}
      {!hideButtons && canUse('stats') && <StatsButton onClick={() => setShowStats(true)} />}
      {!hideButtons && <SettingsButton onClick={() => toggleSettingsRef.current()} />}
      {settingsExpanded && <SettingsCloseButton onClick={() => toggleSettingsRef.current()} />}
      {!hideButtons && <FureaiEntryButton onClick={handleFureaiClick} />}
      {!hideButtons && <WeatherButton onClick={handleEnvironmentClick} />}
      {!hideButtons && <GalleryEntryButton onClick={handleGalleryClick} />}
      {showLocked && <FeatureLockedOverlay onDismiss={() => setShowLocked(false)} />}
    </>
  )
}
