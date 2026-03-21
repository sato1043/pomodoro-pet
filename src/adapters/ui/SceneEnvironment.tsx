import { useState } from 'react'
import { useAppDeps } from './AppContext'
import { useEnvironment } from './EnvironmentContext'
import { WeatherPanel } from './WeatherPanel'
import { KouSelector } from './KouSelector'
import { WorldMapModal } from './WorldMapModal'
import { EnvironmentExitButton } from './EnvironmentExitButton'
import coastlineData from '../../../assets/data/coastline-path.json'

type EnvironmentView = 'weather' | 'worldMap'

export function SceneEnvironment(): JSX.Element {
  const { climateGridPort, settingsService, bus } = useAppDeps()
  const { climate, currentKou, kouDateRanges, updateClimate } = useEnvironment()
  const [view, setView] = useState<EnvironmentView>('weather')

  return (
    <>
      {view === 'weather' && (
        <>
          <WeatherPanel onLocationClick={() => setView('worldMap')} />
          <KouSelector
            currentKou={currentKou}
            autoKou={settingsService.weatherConfig.autoKou}
            manualKouIndex={settingsService.weatherConfig.manualKouIndex}
            kouDateRanges={kouDateRanges}
            onKouChange={(index) => {
              const next = { ...settingsService.weatherConfig, autoKou: false, manualKouIndex: index }
              bus.publish('WeatherConfigChanged', { type: 'WeatherConfigChanged', weather: next, timestamp: Date.now() })
              settingsService.updateWeatherConfig({ autoKou: false, manualKouIndex: index })
            }}
            onAutoToggle={(auto) => {
              const next = { ...settingsService.weatherConfig, autoKou: auto }
              bus.publish('WeatherConfigChanged', { type: 'WeatherConfigChanged', weather: next, timestamp: Date.now() })
              settingsService.updateWeatherConfig({ autoKou: auto })
            }}
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
