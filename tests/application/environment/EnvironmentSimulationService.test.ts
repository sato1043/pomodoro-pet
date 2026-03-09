import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createEnvironmentSimulationService,
  type EnvironmentSimulationService,
  type WeatherDecisionChangedEvent,
} from '../../../src/application/environment/EnvironmentSimulationService'
import type { AstronomyPort, SolarPosition, LunarPosition } from '../../../src/domain/environment/value-objects/SolarPosition'
import type { ClimateGridPort, MonthlyClimateData } from '../../../src/domain/environment/value-objects/ClimateData'
import { DEFAULT_CLIMATE } from '../../../src/domain/environment/value-objects/ClimateData'
import type { ThemeTransitionService } from '../../../src/application/environment/ThemeTransitionService'
import type { EnvironmentThemeParams } from '../../../src/domain/environment/value-objects/EnvironmentTheme'
import { createEventBus, type EventBus } from '../../../src/domain/shared/EventBus'

// --- モック ---

const MOCK_SOLAR: SolarPosition = { altitude: 45, azimuth: 180, eclipticLon: 90 }
const MOCK_LUNAR: LunarPosition = { altitude: -10, azimuth: 90, phaseDeg: 90, illuminationFraction: 0.5, isAboveHorizon: false }

const MOCK_MONTHLY: MonthlyClimateData[] = Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  avgTempC: 5 + i * 2,
  avgHighTempC: 10 + i * 2,
  avgLowTempC: 0 + i * 2,
  avgHumidity: 60,
  avgPrecipMm: 80,
}))

function createMockAstronomy(): AstronomyPort {
  return {
    getSolarPosition: vi.fn().mockReturnValue(MOCK_SOLAR),
    getLunarPosition: vi.fn().mockReturnValue(MOCK_LUNAR),
    searchSunLongitude: vi.fn().mockReturnValue(null),
  }
}

function createMockClimateGrid(): ClimateGridPort {
  return {
    getMonthlyClimate: vi.fn().mockReturnValue(MOCK_MONTHLY),
    isLoaded: true,
  }
}

function createMockThemeTransition(): ThemeTransitionService {
  let _current: EnvironmentThemeParams | null = null
  return {
    transitionTo: vi.fn((target: EnvironmentThemeParams) => { _current = target }),
    applyImmediate: vi.fn((target: EnvironmentThemeParams) => { _current = target }),
    tick: vi.fn().mockReturnValue(null),
    get isTransitioning() { return false },
    get currentParams() { return _current },
  }
}

describe('EnvironmentSimulationService', () => {
  let service: EnvironmentSimulationService
  let astronomy: AstronomyPort
  let climateGrid: ClimateGridPort
  let themeTransition: ThemeTransitionService
  let eventBus: EventBus

  beforeEach(() => {
    astronomy = createMockAstronomy()
    climateGrid = createMockClimateGrid()
    themeTransition = createMockThemeTransition()
    eventBus = createEventBus()

    service = createEnvironmentSimulationService(
      astronomy, climateGrid, themeTransition, eventBus
    )
  })

  it('start()後にisRunning=true', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    expect(service.isRunning).toBe(true)
  })

  it('stop()後にisRunning=false', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    service.stop()
    expect(service.isRunning).toBe(false)
  })

  it('start()で天体位置が取得される', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    expect(astronomy.getSolarPosition).toHaveBeenCalled()
    expect(astronomy.getLunarPosition).toHaveBeenCalled()
    expect(service.currentSolar).toEqual(MOCK_SOLAR)
    expect(service.currentLunar).toEqual(MOCK_LUNAR)
  })

  it('start()で候が解決される', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    expect(service.currentKou).not.toBeNull()
    expect(service.currentKou!.index).toBe(33) // eclipticLon=90 → 夏至初候
  })

  it('start()で天気が決定される', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    expect(service.currentWeather).not.toBeNull()
  })

  it('start()でテーマがthemeTransitionServiceに適用される', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    expect(themeTransition.transitionTo).toHaveBeenCalled()
    expect(themeTransition.applyImmediate).toHaveBeenCalled()
  })

  it('start()で気温が推定される', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    expect(service.currentEstimatedTempC).not.toBeNull()
    expect(typeof service.currentEstimatedTempC).toBe('number')
  })

  it('tick()で30秒未満では再計算しない', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    vi.mocked(astronomy.getSolarPosition).mockClear()

    service.tick(10000) // 10秒
    expect(astronomy.getSolarPosition).not.toHaveBeenCalled()
  })

  it('tick()で30秒経過すると再計算する', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    vi.mocked(astronomy.getSolarPosition).mockClear()

    service.tick(30001) // 30秒超
    expect(astronomy.getSolarPosition).toHaveBeenCalled()
  })

  it('stop()後はtick()で再計算しない', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    service.stop()
    vi.mocked(astronomy.getSolarPosition).mockClear()

    service.tick(60000)
    expect(astronomy.getSolarPosition).not.toHaveBeenCalled()
  })

  it('stop()後の状態はすべてnull', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    service.stop()
    expect(service.currentSolar).toBeNull()
    expect(service.currentLunar).toBeNull()
    expect(service.currentKou).toBeNull()
    expect(service.currentWeather).toBeNull()
    expect(service.currentEstimatedTempC).toBeNull()
  })

  it('onClimateChanged()で気候データが再取得される', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    vi.mocked(climateGrid.getMonthlyClimate).mockClear()

    const newClimate = { ...DEFAULT_CLIMATE, latitude: 51.5, longitude: -0.1, label: 'London' }
    service.onClimateChanged(newClimate)

    expect(climateGrid.getMonthlyClimate).toHaveBeenCalledWith(51.5, -0.1)
  })

  it('start()でWeatherDecisionChangedイベントが発行される', () => {
    const handler = vi.fn()
    eventBus.subscribe('WeatherDecisionChanged', handler)

    service.start(DEFAULT_CLIMATE, 'meadow')

    expect(handler).toHaveBeenCalledTimes(1)
    const event = handler.mock.calls[0][0] as WeatherDecisionChangedEvent
    expect(event.type).toBe('WeatherDecisionChanged')
    expect(event.decision).toBeDefined()
  })

  it('climateGridがunloadedの場合でも安全に動作する', () => {
    const unloadedGrid: ClimateGridPort = {
      getMonthlyClimate: vi.fn().mockReturnValue([]),
      isLoaded: false,
    }
    const svc = createEnvironmentSimulationService(
      astronomy, unloadedGrid, themeTransition, eventBus
    )
    expect(() => svc.start(DEFAULT_CLIMATE, 'meadow')).not.toThrow()
    expect(svc.currentWeather).not.toBeNull()
  })
})
