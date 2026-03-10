import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import type { KouDefinition } from '../../domain/environment/value-objects/Kou'
import type { ClimateConfig } from '../../domain/environment/value-objects/ClimateData'
import { DEFAULT_CLIMATE } from '../../domain/environment/value-objects/ClimateData'
import { resolveTimezone } from '../../domain/environment/value-objects/Timezone'
import type { KouChangedEvent, KouDateRange, KouDateRangesComputedEvent } from '../../application/environment/EnvironmentSimulationService'
import { useAppDeps } from './AppContext'
import { useEventBusCallback } from './hooks/useEventBus'

// --- Context値の型 ---

export interface EnvironmentContextValue {
  /** 現在の地点設定 */
  readonly climate: ClimateConfig
  /** 現在の七十二候 */
  readonly currentKou: KouDefinition | null
  /** 太陽高度角（度）。null = autoWeather無効またはenvSimService未起動 */
  readonly solarAltitude: number | null
  /** 昼間判定（太陽高度 > -6°: 市民薄明以上） */
  readonly isDaytime: boolean
  /** IANAタイムゾーン文字列 */
  readonly timezone: string
  /** 72候の日付範囲（年ごとに計算） */
  readonly kouDateRanges: readonly KouDateRange[]

  /** 地点を変更する（永続化+イベント発行を含む） */
  updateClimate: (climate: ClimateConfig) => void
}

// --- Context ---

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null)

// --- 定数 ---

/** 市民薄明の太陽高度閾値（度） */
const CIVIL_TWILIGHT_ALTITUDE = -6

/** solarAltitude更新間隔（ms） */
const SOLAR_UPDATE_INTERVAL_MS = 60_000

// --- Provider ---

export function EnvironmentProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { settingsService, bus, envSimService } = useAppDeps()

  // climate
  const [climate, setClimate] = useState<ClimateConfig>(
    () => settingsService.weatherConfig.climate ?? DEFAULT_CLIMATE
  )

  // timezone（climateから導出）
  const [timezone, setTimezone] = useState(() =>
    resolveTimezone(climate.latitude, climate.longitude)
  )

  // currentKou
  const [currentKou, setCurrentKou] = useState<KouDefinition | null>(
    () => envSimService.currentKou
  )

  // solarAltitude
  const [solarAltitude, setSolarAltitude] = useState<number | null>(
    () => envSimService.currentSolar?.altitude ?? null
  )

  // kouDateRanges
  const [kouDateRanges, setKouDateRanges] = useState<readonly KouDateRange[]>(
    () => envSimService.kouDateRanges
  )

  // KouChanged購読
  useEventBusCallback<KouChangedEvent>(bus, 'KouChanged', (event) => {
    setCurrentKou(event.kou)
  })

  // KouDateRangesComputed購読
  useEventBusCallback<KouDateRangesComputedEvent>(bus, 'KouDateRangesComputed', (event) => {
    setKouDateRanges(event.ranges)
  })

  // WeatherConfigChanged購読（外部変更のclimate同期）
  useEventBusCallback(bus, 'WeatherConfigChanged', (event: { weather: { climate?: ClimateConfig } }) => {
    const c = event.weather.climate
    if (c) {
      setClimate(c)
      setTimezone(resolveTimezone(c.latitude, c.longitude))
    }
  })

  // solarAltitude定期更新
  const envSimRef = useRef(envSimService)
  envSimRef.current = envSimService

  useEffect(() => {
    const update = (): void => {
      const solar = envSimRef.current.currentSolar
      setSolarAltitude(solar?.altitude ?? null)
    }
    update()
    const id = setInterval(update, SOLAR_UPDATE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // isDaytime導出
  const isDaytime = solarAltitude !== null
    ? solarAltitude > CIVIL_TWILIGHT_ALTITUDE
    : true // solarAltitude不明時はlightをデフォルト

  // updateClimate操作
  const updateClimate = useCallback((newClimate: ClimateConfig) => {
    setClimate(newClimate)
    setTimezone(resolveTimezone(newClimate.latitude, newClimate.longitude))
    settingsService.updateWeatherConfig({ climate: newClimate })
    bus.publish('WeatherConfigChanged', {
      type: 'WeatherConfigChanged',
      weather: { ...settingsService.weatherConfig, climate: newClimate },
      timestamp: Date.now(),
    })
  }, [settingsService, bus])

  return (
    <EnvironmentContext.Provider value={{
      climate,
      currentKou,
      solarAltitude,
      isDaytime,
      timezone,
      kouDateRanges,
      updateClimate,
    }}>
      {children}
    </EnvironmentContext.Provider>
  )
}

// --- Hook ---

export function useEnvironment(): EnvironmentContextValue {
  const ctx = useContext(EnvironmentContext)
  if (!ctx) throw new Error('useEnvironment must be used within EnvironmentProvider')
  return ctx
}
