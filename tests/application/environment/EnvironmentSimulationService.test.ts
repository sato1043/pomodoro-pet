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
import { THEME_TRANSITION_DURATION_MANUAL_MS } from '../../../src/domain/environment/value-objects/ThemeLerp'

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

  it('start()で生成されるテーマに月データフィールドが含まれる', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    const themeParams = vi.mocked(themeTransition.applyImmediate).mock.calls[0][0]
    expect(themeParams.moonPosition).toBeDefined()
    expect(typeof themeParams.moonPhaseDeg).toBe('number')
    expect(typeof themeParams.moonIllumination).toBe('number')
    expect(typeof themeParams.moonIsVisible).toBe('boolean')
    expect(typeof themeParams.moonOpacity).toBe('number')
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

  it('autoWeather有効時、start()でWeatherDecisionChangedイベントが発行される', () => {
    const handler = vi.fn()
    eventBus.subscribe('WeatherDecisionChanged', handler)

    service.setAutoWeather(true)
    service.start(DEFAULT_CLIMATE, 'meadow')

    expect(handler).toHaveBeenCalledTimes(1)
    const event = handler.mock.calls[0][0] as WeatherDecisionChangedEvent
    expect(event.type).toBe('WeatherDecisionChanged')
    expect(event.decision).toBeDefined()
  })

  it('autoWeather無効時、start()でWeatherDecisionChangedイベントは発行されない', () => {
    const handler = vi.fn()
    eventBus.subscribe('WeatherDecisionChanged', handler)

    service.start(DEFAULT_CLIMATE, 'meadow')

    expect(handler).not.toHaveBeenCalled()
  })

  it('climateGridがunloadedの場合でも安全に動作する', () => {
    const unloadedGrid: ClimateGridPort = {
      getMonthlyClimate: vi.fn().mockReturnValue([]),
      isLoaded: false,
    }
    const svc = createEnvironmentSimulationService(
      astronomy, unloadedGrid, themeTransition, eventBus
    )
    svc.setAutoWeather(true)
    expect(() => svc.start(DEFAULT_CLIMATE, 'meadow')).not.toThrow()
    expect(svc.currentWeather).not.toBeNull()
  })

  // --- setAutoWeather / setManualWeather ---

  it('setAutoWeather(true)でautoWeather=trueになる', () => {
    service.setAutoWeather(true)
    expect(service.autoWeather).toBe(true)
  })

  it('setAutoWeather(false)でautoWeather=falseに戻る', () => {
    service.setAutoWeather(true)
    service.setAutoWeather(false)
    expect(service.autoWeather).toBe(false)
  })

  it('autoWeather=falseの場合currentWeatherはmanual天気を返す', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    expect(service.autoWeather).toBe(false)
    expect(service.currentWeather).toEqual({
      weather: 'sunny',
      precipIntensity: 0,
      cloudDensity: 0.1,
    })
  })

  it('setManualWeather()で手動天気が反映される', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    service.setManualWeather({ weather: 'rainy', precipIntensity: 0.8, cloudDensity: 0.7 })
    expect(service.currentWeather).toEqual({
      weather: 'rainy',
      precipIntensity: 0.8,
      cloudDensity: 0.7,
    })
  })

  it('autoWeather切替で天気ソースが切り替わる', () => {
    service.setAutoWeather(true)
    service.start(DEFAULT_CLIMATE, 'meadow')
    const autoWeather = service.currentWeather

    service.setManualWeather({ weather: 'snowy', precipIntensity: 0.5, cloudDensity: 0.6 })
    service.setAutoWeather(false)
    // tick()で再計算を発火
    service.tick(30001)

    expect(service.currentWeather).toEqual({
      weather: 'snowy',
      precipIntensity: 0.5,
      cloudDensity: 0.6,
    })

    service.setAutoWeather(true)
    service.tick(30001)
    // autoに戻ると自動決定天気が返る
    expect(service.currentWeather).toEqual(autoWeather)
  })

  it('setAutoWeather切替でテーマが即座に再計算される', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    vi.mocked(themeTransition.transitionTo).mockClear()

    service.setAutoWeather(true)
    service.tick(0) // timeSinceLastAstronomyUpdateがINTERVAL以上なので再計算
    expect(themeTransition.transitionTo).toHaveBeenCalled()
  })

  // --- setManualTimeOfDay ---

  it('setManualTimeOfDay(night)でテーマが夜間の値で再計算される', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    vi.mocked(themeTransition.transitionTo).mockClear()

    service.setManualTimeOfDay('night')
    service.tick(0)

    expect(themeTransition.transitionTo).toHaveBeenCalled()
    const themeParams = vi.mocked(themeTransition.transitionTo).mock.calls[0][0]
    // night（altitude=-20）ではexposureが低い値になる
    expect(themeParams.exposure).toBeLessThan(0.5)
  })

  it('setManualTimeOfDay(day)でテーマが昼間の値で再計算される', () => {
    // モックを夜間太陽に設定（実時刻=夜でも手動day→昼テーマになることを確認）
    const nightSolar: SolarPosition = { altitude: -30, azimuth: 0, eclipticLon: 90 }
    vi.mocked(astronomy.getSolarPosition).mockReturnValue(nightSolar)

    service.start(DEFAULT_CLIMATE, 'meadow')
    vi.mocked(themeTransition.transitionTo).mockClear()

    service.setManualTimeOfDay('day')
    service.tick(0)

    expect(themeTransition.transitionTo).toHaveBeenCalled()
    const themeParams = vi.mocked(themeTransition.transitionTo).mock.calls[0][0]
    // day（altitude=50）ではexposureが高い値になる
    expect(themeParams.exposure).toBeGreaterThan(0.8)
  })

  it('setManualTimeOfDay(null)で実太陽位置に戻る', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')

    service.setManualTimeOfDay('night')
    service.tick(0)
    vi.mocked(themeTransition.transitionTo).mockClear()

    service.setManualTimeOfDay(null)
    service.tick(0)

    expect(themeTransition.transitionTo).toHaveBeenCalled()
    const themeParams = vi.mocked(themeTransition.transitionTo).mock.calls[0][0]
    // MOCK_SOLAR.altitude=45 → 昼間の高いexposure
    expect(themeParams.exposure).toBeGreaterThan(0.8)
  })

  it('setManualTimeOfDayは候計算に影響しない', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    const kouBefore = service.currentKou

    service.setManualTimeOfDay('night')
    service.tick(0)

    // 候は実太陽のeclipticLonで決まるため変化しない
    expect(service.currentKou).toEqual(kouBefore)
  })

  it('setManualTimeOfDay切替でテーマが即時再計算される', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    vi.mocked(themeTransition.transitionTo).mockClear()

    service.setManualTimeOfDay('evening')
    service.tick(0)
    expect(themeTransition.transitionTo).toHaveBeenCalledTimes(1)
  })

  it('stop()でtimeOfDayOverrideがリセットされる', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    service.setManualTimeOfDay('night')
    service.stop()

    // 再start時にnullと同等（実太陽位置を使用）
    service.start(DEFAULT_CLIMATE, 'meadow')
    const themeParams = vi.mocked(themeTransition.transitionTo).mock.calls.at(-1)?.[0]
    // MOCK_SOLAR.altitude=45 → 昼間のexposure
    expect(themeParams?.exposure).toBeGreaterThan(0.8)
  })

  // --- 手動操作時の遷移時間 ---

  // --- setManualKou ---

  it('setManualKou()で指定indexの候が使用される', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    // MOCK_SOLAR.eclipticLon=90 → 自動ではindex 33（夏至初候）
    expect(service.currentKou!.index).toBe(33)

    service.setManualKou(0)
    service.tick(0) // 即時再計算
    expect(service.currentKou!.index).toBe(0) // 小寒初候
  })

  it('setManualKou(null)で天文計算による候に戻る', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    service.setManualKou(15) // 春分初候
    service.tick(0)
    expect(service.currentKou!.index).toBe(15)

    service.setManualKou(null)
    service.tick(0)
    expect(service.currentKou!.index).toBe(33) // eclipticLon=90 → 夏至初候
  })

  it('setManualKou()で天気が再決定される（autoWeather時）', () => {
    service.setAutoWeather(true)
    service.start(DEFAULT_CLIMATE, 'meadow')

    const handler = vi.fn()
    eventBus.subscribe('WeatherDecisionChanged', handler)

    service.setManualKou(60)
    service.tick(0)

    expect(handler).toHaveBeenCalled()
  })

  it('setManualKou時の遷移時間がMANUAL_MS（1.5秒）になる', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    vi.mocked(themeTransition.transitionTo).mockClear()

    service.setManualKou(10)
    service.tick(0)

    expect(themeTransition.transitionTo).toHaveBeenCalledWith(
      expect.any(Object),
      THEME_TRANSITION_DURATION_MANUAL_MS
    )
  })

  it('stop()でkouIndexOverrideがリセットされる', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    service.setManualKou(15)
    service.tick(0)
    expect(service.currentKou!.index).toBe(15)

    service.stop()
    service.start(DEFAULT_CLIMATE, 'meadow')
    // リセット後は天文計算の値に戻る
    expect(service.currentKou!.index).toBe(33)
  })

  it('setManualTimeOfDay時の遷移時間がMANUAL_MS（1.5秒）になる', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    vi.mocked(themeTransition.transitionTo).mockClear()

    service.setManualTimeOfDay('night')
    service.tick(0)

    expect(themeTransition.transitionTo).toHaveBeenCalledWith(
      expect.any(Object),
      THEME_TRANSITION_DURATION_MANUAL_MS
    )
  })

  it('setManualWeather時の遷移時間がMANUAL_MS（1.5秒）になる', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    vi.mocked(themeTransition.transitionTo).mockClear()

    service.setManualWeather({ weather: 'rainy', precipIntensity: 0.5, cloudDensity: 0.6 })
    service.tick(0)

    expect(themeTransition.transitionTo).toHaveBeenCalledWith(
      expect.any(Object),
      THEME_TRANSITION_DURATION_MANUAL_MS
    )
  })

  it('通常tick()の遷移時間が30秒になる', () => {
    service.start(DEFAULT_CLIMATE, 'meadow')
    vi.mocked(themeTransition.transitionTo).mockClear()

    service.tick(30001) // 30秒超で通常の再計算

    expect(themeTransition.transitionTo).toHaveBeenCalledWith(
      expect.any(Object),
      30_000
    )
  })

  // --- kouDateRanges ---

  it('start()でkouDateRangesが計算される（searchSunLongitude成功時）', () => {
    // Mock: each kou starts 5 days after the previous one (simplified)
    const baseDate = new Date(2026, 0, 5) // Jan 5
    vi.mocked(astronomy.searchSunLongitude).mockImplementation((_lon: number, _from: Date, _limit: number) => {
      // Return dates 5 days apart for each call
      const callIndex = vi.mocked(astronomy.searchSunLongitude).mock.calls.length - 1
      const d = new Date(baseDate)
      d.setDate(d.getDate() + callIndex * 5)
      return d
    })

    service.start(DEFAULT_CLIMATE, 'meadow')

    const ranges = service.kouDateRanges
    expect(ranges.length).toBe(72)
    expect(ranges[0].index).toBe(0)
    expect(ranges[0].startDate).toEqual(baseDate)
  })

  it('kouDateRangesの各範囲のendDateは次の候のstartDate - 1日', () => {
    const baseDate = new Date(2026, 0, 5)
    vi.mocked(astronomy.searchSunLongitude).mockImplementation(() => {
      const callIndex = vi.mocked(astronomy.searchSunLongitude).mock.calls.length - 1
      const d = new Date(baseDate)
      d.setDate(d.getDate() + callIndex * 5)
      return d
    })

    service.start(DEFAULT_CLIMATE, 'meadow')

    const ranges = service.kouDateRanges
    // endDate of range[0] should be startDate of range[1] - 1 day
    if (ranges.length >= 2) {
      const expected = new Date(ranges[1].startDate)
      expected.setDate(expected.getDate() - 1)
      expect(ranges[0].endDate.getDate()).toBe(expected.getDate())
      expect(ranges[0].endDate.getMonth()).toBe(expected.getMonth())
    }
  })

  it('start()でKouDateRangesComputedイベントが発行される', () => {
    vi.mocked(astronomy.searchSunLongitude).mockImplementation(() => {
      const callIndex = vi.mocked(astronomy.searchSunLongitude).mock.calls.length - 1
      const d = new Date(2026, 0, 5)
      d.setDate(d.getDate() + callIndex * 5)
      return d
    })

    const handler = vi.fn()
    eventBus.subscribe('KouDateRangesComputed', handler)

    service.start(DEFAULT_CLIMATE, 'meadow')

    expect(handler).toHaveBeenCalledTimes(1)
    const event = handler.mock.calls[0][0]
    expect(event.type).toBe('KouDateRangesComputed')
    expect(event.ranges.length).toBe(72)
  })

  it('searchSunLongitudeが全てnullの場合はkouDateRangesが空', () => {
    // Default mock returns null
    service.start(DEFAULT_CLIMATE, 'meadow')
    expect(service.kouDateRanges).toEqual([])
  })

  it('stop()でkouDateRangesがリセットされる', () => {
    vi.mocked(astronomy.searchSunLongitude).mockImplementation(() => {
      const callIndex = vi.mocked(astronomy.searchSunLongitude).mock.calls.length - 1
      const d = new Date(2026, 0, 5)
      d.setDate(d.getDate() + callIndex * 5)
      return d
    })

    service.start(DEFAULT_CLIMATE, 'meadow')
    expect(service.kouDateRanges.length).toBeGreaterThan(0)

    service.stop()
    expect(service.kouDateRanges).toEqual([])
  })
})
