import { useState, useRef, useCallback, useEffect } from 'react'
import { useLicenseMode } from './LicenseContext'
import { useAppDeps } from './AppContext'
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
import { DEFAULT_CLIMATE } from '../../domain/environment/value-objects/ClimateData'
import type { ClimateConfig } from '../../domain/environment/value-objects/ClimateData'
import { resolveTimezone } from '../../domain/environment/value-objects/Timezone'
import type { KouDefinition } from '../../domain/environment/value-objects/Kou'
import type { KouChangedEvent } from '../../application/environment/EnvironmentSimulationService'
import coastlineData from '../../../assets/data/coastline-path.json'

export function SceneFree(): JSX.Element {
  const { canUse } = useLicenseMode()
  const { fureaiCoordinator, galleryCoordinator, settingsService, bus, envSimService } = useAppDeps()
  const [showStats, setShowStats] = useState(false)
  const [settingsExpanded, setSettingsExpanded] = useState(false)
  const [showWeather, setShowWeather] = useState(false)
  const [showLocked, setShowLocked] = useState(false)
  const [showWorldMap, setShowWorldMap] = useState(false)
  const [timezone, setTimezone] = useState(() => {
    const c = settingsService.weatherConfig.climate
    return resolveTimezone(c?.latitude ?? DEFAULT_CLIMATE.latitude, c?.longitude ?? DEFAULT_CLIMATE.longitude)
  })
  const [currentKou, setCurrentKou] = useState<KouDefinition | null>(envSimService.currentKou)
  const toggleSettingsRef = useRef<() => void>(() => {})

  // KouChangedイベント購読
  useEffect(() => {
    const unsubscribe = bus.subscribe<KouChangedEvent>('KouChanged', (event) => {
      setCurrentKou(event.kou)
    })
    return unsubscribe
  }, [bus])
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
        label={settingsService.weatherConfig.climate?.label ?? DEFAULT_CLIMATE.label}
      />}
      {!hideButtons && canUse('weatherSettings') && <WeatherButton onClick={() => setShowWeather(true)} />}
      {!hideButtons && <GalleryEntryButton onClick={handleGalleryClick} />}
      {showWorldMap && (
        <WorldMapModal
          isOpen={showWorldMap}
          currentClimate={settingsService.weatherConfig.climate ?? DEFAULT_CLIMATE}
          coastlinePath={(coastlineData as { path: string; idlPath: string }).path}
          idlPath={(coastlineData as { path: string; idlPath: string }).idlPath}
          onClose={() => setShowWorldMap(false)}
          onApply={(climate: ClimateConfig) => {
            setTimezone(resolveTimezone(climate.latitude, climate.longitude))
            settingsService.updateWeatherConfig({ climate, autoWeather: true })
            bus.publish('WeatherConfigChanged', {
              type: 'WeatherConfigChanged',
              weather: { ...settingsService.weatherConfig, climate, autoWeather: true },
              timestamp: Date.now(),
            })
          }}
        />
      )}
      {showLocked && <FeatureLockedOverlay onDismiss={() => setShowLocked(false)} />}
      <KouDisplay kou={currentKou} visible={settingsService.weatherConfig.autoWeather && !hideButtons} />
    </>
  )
}
