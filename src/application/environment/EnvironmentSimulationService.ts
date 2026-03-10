import type { AstronomyPort, SolarPosition, LunarPosition } from '../../domain/environment/value-objects/SolarPosition'
import type { TimeOfDay } from '../../domain/environment/value-objects/WeatherConfig'
import type { KouDefinition } from '../../domain/environment/value-objects/Kou'
import { kouProgress, KOU_DEFINITIONS } from '../../domain/environment/value-objects/Kou'
import type { ClimateConfig, ClimateGridPort, KouClimate } from '../../domain/environment/value-objects/ClimateData'
import { DEFAULT_CLIMATE, interpolateToKouClimate, estimateTemperature } from '../../domain/environment/value-objects/ClimateData'
import type { WeatherDecision } from '../../domain/environment/value-objects/WeatherDecision'
import { mulberry32, decideWeather } from '../../domain/environment/value-objects/WeatherDecision'
import { computeThemeFromCelestial, computeLightDirection } from '../../domain/environment/value-objects/CelestialTheme'
import { THEME_TRANSITION_DURATION_MANUAL_MS } from '../../domain/environment/value-objects/ThemeLerp'
import type { ThemeTransitionService } from './ThemeTransitionService'
import type { EventBus } from '../../domain/shared/EventBus'
import type { ScenePresetName } from '../../domain/environment/value-objects/ScenePreset'

// --- イベント型 ---

export interface KouChangedEvent {
  readonly type: 'KouChanged'
  readonly kou: KouDefinition
  readonly previousKou: KouDefinition | null
}

export interface WeatherDecisionChangedEvent {
  readonly type: 'WeatherDecisionChanged'
  readonly decision: WeatherDecision
}

/** 72候の日付範囲（年ごとに計算） */
export interface KouDateRange {
  readonly index: number
  readonly startDate: Date
  readonly endDate: Date
}

export interface KouDateRangesComputedEvent {
  readonly type: 'KouDateRangesComputed'
  readonly ranges: readonly KouDateRange[]
}

// --- 定数 ---

const ASTRONOMY_UPDATE_INTERVAL_MS = 30_000

// --- インターフェース ---

export interface EnvironmentSimulationService {
  start(climate: ClimateConfig, scenePreset: ScenePresetName): void
  onClimateChanged(climate: ClimateConfig): void
  onScenePresetChanged(scenePreset: ScenePresetName): void
  /** autoWeather有効/無効を切り替える。無効時はsetManualWeatherで設定した天気をテーマ生成に使う */
  setAutoWeather(enabled: boolean): void
  /** autoWeather=false時の手動天気を設定し、テーマを再生成する */
  setManualWeather(weather: WeatherDecision): void
  /** 手動時間帯を設定する。nullで実太陽位置に戻る。テーマ計算のみ影響し、候計算には影響しない */
  setManualTimeOfDay(timeOfDay: TimeOfDay | null): void
  /** 手動候を設定する。nullで天文計算による自動候に戻る */
  setManualKou(kouIndex: number | null): void
  tick(deltaMs: number): void
  stop(): void
  readonly currentSolar: SolarPosition | null
  readonly currentLunar: LunarPosition | null
  readonly currentKou: KouDefinition | null
  readonly currentWeather: WeatherDecision | null
  readonly currentEstimatedTempC: number | null
  readonly kouDateRanges: readonly KouDateRange[]
  readonly isRunning: boolean
  readonly autoWeather: boolean
}

// --- ヘルパー ---

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

// --- 手動timeOfDay用の擬似天体位置 ---

const SIMULATED_ALTITUDE: Record<TimeOfDay, number> = {
  morning: 10,   // 低い太陽（東）
  day: 50,       // 高い太陽（南）
  evening: 5,    // 低い太陽（西）
  night: -20,    // 地平線下
}

const SIMULATED_AZIMUTH: Record<TimeOfDay, number> = {
  morning: 90,   // 東
  day: 180,      // 南
  evening: 270,  // 西
  night: 0,      // 北（任意）
}

function simulateSolarForTimeOfDay(timeOfDay: TimeOfDay, realSolar: SolarPosition): SolarPosition {
  return {
    altitude: SIMULATED_ALTITUDE[timeOfDay],
    azimuth: SIMULATED_AZIMUTH[timeOfDay],
    eclipticLon: realSolar.eclipticLon, // 候計算用に実値を保持
  }
}

function simulateLunarForTimeOfDay(timeOfDay: TimeOfDay): LunarPosition {
  if (timeOfDay === 'night') {
    return {
      altitude: 40,
      azimuth: 180,
      phaseDeg: 90,
      illuminationFraction: 0.5,
      isAboveHorizon: true,
    }
  }
  return {
    altitude: -10,
    azimuth: 0,
    phaseDeg: 180,
    illuminationFraction: 0.5,
    isAboveHorizon: false,
  }
}

// --- ファクトリ ---

export function createEnvironmentSimulationService(
  astronomyPort: AstronomyPort,
  climateGridPort: ClimateGridPort,
  themeTransitionService: ThemeTransitionService,
  eventBus: EventBus
): EnvironmentSimulationService {
  let climate: ClimateConfig = DEFAULT_CLIMATE
  let scenePreset: ScenePresetName = 'meadow'
  let isRunning = false
  let isAutoWeather = false
  let timeOfDayOverride: TimeOfDay | null = null
  let kouIndexOverride: number | null = null
  let cachedKouDateRanges: readonly KouDateRange[] = []
  let cachedKouDateRangesYear = -1

  let cachedSolar: SolarPosition | null = null
  let cachedLunar: LunarPosition | null = null
  let cachedKouClimates: readonly KouClimate[] = []
  let autoWeatherDecision: WeatherDecision | null = null
  let manualWeatherDecision: WeatherDecision = { weather: 'sunny', precipIntensity: 0, cloudDensity: 0.1 }
  let currentKou: KouDefinition | null = null
  let currentEstimatedTempC: number = 20
  let currentAvgPrecipMm: number = 5

  let timeSinceLastAstronomyUpdate = 0
  let lastWeatherDecisionDayOfYear = -1
  let pendingTransitionDurationMs: number | null = null

  function computeKouDateRanges(year: number): void {
    if (year === cachedKouDateRangesYear) return
    cachedKouDateRangesYear = year
    // 前年12月1日から探索開始（小寒初候 λ=285° は1月初旬）
    const searchStart = new Date(year - 1, 11, 1)

    // Step 1: 72候の開始日を順次探索（前の候の日付から次を探す連鎖方式）
    const startDates: (Date | null)[] = []
    const kou0Lon = KOU_DEFINITIONS[0].eclipticLonStart
    const kou0Date = astronomyPort.searchSunLongitude(kou0Lon, searchStart, 400)
    startDates[0] = kou0Date
    let prevDate = kou0Date
    for (let i = 1; i < 72; i++) {
      if (!prevDate) { startDates[i] = null; continue }
      const lon = KOU_DEFINITIONS[i].eclipticLonStart
      const found = astronomyPort.searchSunLongitude(lon, prevDate, 30)
      startDates[i] = found
      if (found) prevDate = found
    }
    // 最後の候の終了日 = 翌年のkou0の開始日
    const nextYearKou0 = prevDate
      ? astronomyPort.searchSunLongitude(kou0Lon, prevDate, 30)
      : null

    // Step 2: 開始日と次の候の開始日から日付範囲を生成
    const ranges: KouDateRange[] = []
    for (let i = 0; i < 72; i++) {
      const startDate = startDates[i]
      if (!startDate) continue
      const nextStart = i < 71 ? startDates[i + 1] : nextYearKou0
      if (!nextStart) continue
      const endDay = new Date(nextStart)
      endDay.setDate(endDay.getDate() - 1)
      ranges.push({ index: i, startDate, endDate: endDay })
    }

    cachedKouDateRanges = ranges
    eventBus.publish('KouDateRangesComputed', {
      type: 'KouDateRangesComputed',
      ranges: cachedKouDateRanges,
    } satisfies KouDateRangesComputedEvent)
  }

  function loadClimateAndCompute(clim: ClimateConfig): void {
    climate = clim
    if (climateGridPort.isLoaded) {
      const monthlyData = climateGridPort.getMonthlyClimate(clim.latitude, clim.longitude)
      cachedKouClimates = interpolateToKouClimate(monthlyData)
    }
  }

  function runFullComputation(): void {
    const now = new Date()
    const { latitude, longitude } = climate

    // Step 1: 天体位置
    cachedSolar = astronomyPort.getSolarPosition(now, latitude, longitude)
    cachedLunar = astronomyPort.getLunarPosition(now, latitude, longitude)

    // Step 2: 候解決（手動候設定時はオーバーライド）
    const kou = kouIndexOverride !== null
      ? KOU_DEFINITIONS[kouIndexOverride]
      : kouProgress(cachedSolar.eclipticLon).kou
    const previousKou = currentKou
    currentKou = kou

    // Step 3: 気温・降水量推定
    if (cachedKouClimates.length > 0) {
      const kouClimate = cachedKouClimates[kou.index]
      currentEstimatedTempC = estimateTemperature(kouClimate, now.getHours())
      currentAvgPrecipMm = kouClimate.avgPrecipMm
    }

    // Step 4: 天気決定（autoWeather有効時のみ、日変更時のみ）
    if (isAutoWeather) {
      const dayOfYear = getDayOfYear(now)
      if (dayOfYear !== lastWeatherDecisionDayOfYear) {
        lastWeatherDecisionDayOfYear = dayOfYear
        const seed = mulberry32(now.getFullYear() * 366 + dayOfYear)
        if (cachedKouClimates.length > 0) {
          const kouClimate = cachedKouClimates[kou.index]
          autoWeatherDecision = decideWeather(kouClimate, currentEstimatedTempC, seed)
        } else {
          autoWeatherDecision = { weather: 'sunny', precipIntensity: 0, cloudDensity: 0.1 }
        }
        eventBus.publish('WeatherDecisionChanged', {
          type: 'WeatherDecisionChanged',
          decision: autoWeatherDecision,
        } satisfies WeatherDecisionChangedEvent)
      }
    }

    // Step 5-7: テーマ生成（天文計算ベースのライティング）
    // autoWeather=false時もテーマ生成を実行する（手動天気をテーマ計算に渡す）
    const effectiveWeather = isAutoWeather
      ? (autoWeatherDecision ?? { weather: 'sunny' as const, precipIntensity: 0, cloudDensity: 0.1 })
      : manualWeatherDecision

    // 手動timeOfDay設定時は擬似太陽/月位置でテーマを計算（候計算には影響しない）
    const themeSolar = timeOfDayOverride
      ? simulateSolarForTimeOfDay(timeOfDayOverride, cachedSolar)
      : cachedSolar
    const themeLunar = timeOfDayOverride
      ? simulateLunarForTimeOfDay(timeOfDayOverride)
      : cachedLunar

    const themeParams = computeThemeFromCelestial(
      themeSolar, themeLunar, effectiveWeather, currentEstimatedTempC, scenePreset, currentAvgPrecipMm
    )

    // Step 6: 光源方向
    const lightDir = computeLightDirection(themeSolar, themeLunar)

    // Step 7: テーマ遷移
    const mergedTheme = {
      ...themeParams,
      sunPosition: lightDir.position,
      sunColor: lightDir.color,
      sunIntensity: lightDir.intensity,
    }
    const transitionMs = pendingTransitionDurationMs ?? ASTRONOMY_UPDATE_INTERVAL_MS
    pendingTransitionDurationMs = null
    themeTransitionService.transitionTo(mergedTheme, transitionMs)

    // 候変更イベント
    if (previousKou && previousKou.index !== kou.index) {
      eventBus.publish('KouChanged', {
        type: 'KouChanged',
        kou,
        previousKou,
      } satisfies KouChangedEvent)
    }
  }

  return {
    start(clim: ClimateConfig, preset: ScenePresetName): void {
      scenePreset = preset
      loadClimateAndCompute(clim)
      isRunning = true
      lastWeatherDecisionDayOfYear = -1
      // 候の日付範囲を計算
      computeKouDateRanges(new Date().getFullYear())
      // 初回は即時計算
      runFullComputation()
      timeSinceLastAstronomyUpdate = 0
      // 初回は遷移なしで即時適用
      if (themeTransitionService.currentParams) {
        themeTransitionService.applyImmediate(themeTransitionService.currentParams)
      }
    },

    onClimateChanged(clim: ClimateConfig): void {
      loadClimateAndCompute(clim)
      lastWeatherDecisionDayOfYear = -1 // 天気再決定を強制
      pendingTransitionDurationMs = THEME_TRANSITION_DURATION_MANUAL_MS
      timeSinceLastAstronomyUpdate = ASTRONOMY_UPDATE_INTERVAL_MS // 即時再計算
    },

    onScenePresetChanged(preset: ScenePresetName): void {
      scenePreset = preset
      pendingTransitionDurationMs = THEME_TRANSITION_DURATION_MANUAL_MS
      timeSinceLastAstronomyUpdate = ASTRONOMY_UPDATE_INTERVAL_MS // 即時再計算
    },

    setAutoWeather(enabled: boolean): void {
      const changed = isAutoWeather !== enabled
      isAutoWeather = enabled
      if (changed && isRunning) {
        if (enabled) {
          lastWeatherDecisionDayOfYear = -1 // 天気再決定を強制
        }
        pendingTransitionDurationMs = THEME_TRANSITION_DURATION_MANUAL_MS
        timeSinceLastAstronomyUpdate = ASTRONOMY_UPDATE_INTERVAL_MS // 即時再計算
      }
    },

    setManualWeather(weather: WeatherDecision): void {
      manualWeatherDecision = weather
      if (!isAutoWeather && isRunning) {
        pendingTransitionDurationMs = THEME_TRANSITION_DURATION_MANUAL_MS
        timeSinceLastAstronomyUpdate = ASTRONOMY_UPDATE_INTERVAL_MS // 即時再計算
      }
    },

    setManualTimeOfDay(timeOfDay: TimeOfDay | null): void {
      const changed = timeOfDayOverride !== timeOfDay
      timeOfDayOverride = timeOfDay
      if (changed && isRunning) {
        pendingTransitionDurationMs = THEME_TRANSITION_DURATION_MANUAL_MS
        timeSinceLastAstronomyUpdate = ASTRONOMY_UPDATE_INTERVAL_MS // 即時再計算
      }
    },

    setManualKou(kouIndex: number | null): void {
      const changed = kouIndexOverride !== kouIndex
      kouIndexOverride = kouIndex
      if (changed && isRunning) {
        lastWeatherDecisionDayOfYear = -1 // 候変更で気候が変わるため天気再決定を強制
        pendingTransitionDurationMs = THEME_TRANSITION_DURATION_MANUAL_MS
        timeSinceLastAstronomyUpdate = ASTRONOMY_UPDATE_INTERVAL_MS // 即時再計算
      }
    },

    tick(deltaMs: number): void {
      if (!isRunning) return

      timeSinceLastAstronomyUpdate += deltaMs
      if (timeSinceLastAstronomyUpdate >= ASTRONOMY_UPDATE_INTERVAL_MS) {
        timeSinceLastAstronomyUpdate = 0
        runFullComputation()
      }
    },

    stop(): void {
      isRunning = false
      cachedSolar = null
      cachedLunar = null
      cachedKouClimates = []
      autoWeatherDecision = null
      currentKou = null
      timeOfDayOverride = null
      kouIndexOverride = null
      cachedKouDateRanges = []
      cachedKouDateRangesYear = -1
      pendingTransitionDurationMs = null
      lastWeatherDecisionDayOfYear = -1
      timeSinceLastAstronomyUpdate = 0
    },

    get currentSolar(): SolarPosition | null { return cachedSolar },
    get currentLunar(): LunarPosition | null { return cachedLunar },
    get currentKou(): KouDefinition | null { return currentKou },
    get currentWeather(): WeatherDecision | null {
      if (!isRunning) return null
      return isAutoWeather ? autoWeatherDecision : manualWeatherDecision
    },
    get currentEstimatedTempC(): number | null { return isRunning ? currentEstimatedTempC : null },
    get kouDateRanges(): readonly KouDateRange[] { return cachedKouDateRanges },
    get isRunning(): boolean { return isRunning },
    get autoWeather(): boolean { return isAutoWeather },
  }
}
