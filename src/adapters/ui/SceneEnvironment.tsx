import { useState } from 'react'
import { useAppDeps } from './AppContext'
import { useEnvironment } from './EnvironmentContext'
import { useEventBusCallback } from './hooks/useEventBus'
import { WeatherPanel } from './WeatherPanel'
import { KouSelector } from './KouSelector'
import { MoonPhaseSelector } from './MoonPhaseSelector'
import { WorldMapModal } from './WorldMapModal'
import { EnvironmentExitButton } from './EnvironmentExitButton'
import type { WeatherConfig } from '../../domain/environment/value-objects/WeatherConfig'
import coastlineData from '../../../assets/data/coastline-path.json'

type EnvironmentView = 'weather' | 'worldMap'

export function SceneEnvironment(): JSX.Element {
  const { climateGridPort, settingsService, bus } = useAppDeps()
  const { climate, currentKou, kouDateRanges, currentPhaseDeg, updateClimate } = useEnvironment()
  const [view, setView] = useState<EnvironmentView>('weather')

  // weatherConfigをReact stateで管理し、外部変更（MoonPhaseSelector等）を即座に反映
  const [wc, setWc] = useState<WeatherConfig>(() => settingsService.weatherConfig)
  useEventBusCallback(bus, 'WeatherConfigChanged', (event: { weather: WeatherConfig }) => {
    setWc(event.weather)
  })

  function updateConfig(partial: Partial<WeatherConfig>): void {
    const next = { ...settingsService.weatherConfig, ...partial }
    bus.publish('WeatherConfigChanged', { type: 'WeatherConfigChanged', weather: next, timestamp: Date.now() })
    settingsService.updateWeatherConfig(partial)
  }

  return (
    <>
      {view === 'weather' && (
        <>
          <WeatherPanel onLocationClick={() => setView('worldMap')} />
          <KouSelector
            currentKou={currentKou}
            autoKou={wc.autoKou}
            manualKouIndex={wc.manualKouIndex}
            kouDateRanges={kouDateRanges}
            onKouChange={(index) => updateConfig({ autoKou: false, manualKouIndex: index })}
            onAutoToggle={(auto) => updateConfig({ autoKou: auto })}
          />
          <MoonPhaseSelector
            currentPhaseDeg={currentPhaseDeg}
            autoMoonPhase={wc.autoMoonPhase}
            manualPhaseIndex={wc.moonPhaseIndex}
            onPhaseChange={(index) => updateConfig({ autoMoonPhase: false, moonPhaseIndex: index })}
            onAutoToggle={(auto) => updateConfig({ autoMoonPhase: auto })}
          />
        </>
      )}
      {view === 'worldMap' && (
        <WorldMapModal
          isOpen={true}
          currentClimate={climate}
          coastlinePath={(coastlineData as { path: string; idlPath: string }).path}
          idlPath={(coastlineData as { path: string; idlPath: string }).idlPath}
          onClose={() => setView('weather')}
          onApply={updateClimate}
          getMonthlyClimate={climateGridPort.isLoaded ? climateGridPort.getMonthlyClimate : undefined}
        />
      )}
      <EnvironmentExitButton />
    </>
  )
}
