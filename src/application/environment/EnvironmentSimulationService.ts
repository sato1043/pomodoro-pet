import type { AstronomyPort, SolarPosition, LunarPosition } from '../../domain/environment/value-objects/SolarPosition'
import type { KouDefinition } from '../../domain/environment/value-objects/Kou'
import { kouProgress } from '../../domain/environment/value-objects/Kou'
import type { ClimateConfig, ClimateGridPort, KouClimate } from '../../domain/environment/value-objects/ClimateData'
import { DEFAULT_CLIMATE, interpolateToKouClimate, estimateTemperature } from '../../domain/environment/value-objects/ClimateData'
import type { WeatherDecision } from '../../domain/environment/value-objects/WeatherDecision'
import { mulberry32, decideWeather } from '../../domain/environment/value-objects/WeatherDecision'
import { computeThemeFromCelestial, computeLightDirection } from '../../domain/environment/value-objects/CelestialTheme'
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

// --- 定数 ---

const ASTRONOMY_UPDATE_INTERVAL_MS = 30_000

// --- インターフェース ---

export interface EnvironmentSimulationService {
  start(climate: ClimateConfig, scenePreset: ScenePresetName): void
  onClimateChanged(climate: ClimateConfig): void
  onScenePresetChanged(scenePreset: ScenePresetName): void
  tick(deltaMs: number): void
  stop(): void
  readonly currentSolar: SolarPosition | null
  readonly currentLunar: LunarPosition | null
  readonly currentKou: KouDefinition | null
  readonly currentWeather: WeatherDecision | null
  readonly currentEstimatedTempC: number | null
  readonly isRunning: boolean
}

// --- ヘルパー ---

function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
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

  let cachedSolar: SolarPosition | null = null
  let cachedLunar: LunarPosition | null = null
  let cachedKouClimates: readonly KouClimate[] = []
  let currentWeatherDecision: WeatherDecision | null = null
  let currentKou: KouDefinition | null = null
  let currentEstimatedTempC: number = 20

  let timeSinceLastAstronomyUpdate = 0
  let lastWeatherDecisionDayOfYear = -1

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

    // Step 2: 候解決
    const { kou } = kouProgress(cachedSolar.eclipticLon)
    const previousKou = currentKou
    currentKou = kou

    // Step 3: 気温推定
    if (cachedKouClimates.length > 0) {
      const kouClimate = cachedKouClimates[kou.index]
      currentEstimatedTempC = estimateTemperature(kouClimate, now.getHours())
    }

    // Step 4: 天気決定（日変更時のみ）
    const dayOfYear = getDayOfYear(now)
    if (dayOfYear !== lastWeatherDecisionDayOfYear) {
      lastWeatherDecisionDayOfYear = dayOfYear
      const seed = mulberry32(now.getFullYear() * 366 + dayOfYear)
      if (cachedKouClimates.length > 0) {
        const kouClimate = cachedKouClimates[kou.index]
        currentWeatherDecision = decideWeather(kouClimate, currentEstimatedTempC, seed)
      } else {
        currentWeatherDecision = { weather: 'sunny', precipIntensity: 0, cloudDensity: 0.1 }
      }
      eventBus.publish('WeatherDecisionChanged', {
        type: 'WeatherDecisionChanged',
        decision: currentWeatherDecision,
      } satisfies WeatherDecisionChangedEvent)
    }

    if (!currentWeatherDecision) {
      currentWeatherDecision = { weather: 'sunny', precipIntensity: 0, cloudDensity: 0.1 }
    }

    // Step 5: テーマ生成
    const themeParams = computeThemeFromCelestial(
      cachedSolar, cachedLunar, currentWeatherDecision, currentEstimatedTempC, scenePreset
    )

    // Step 6: 光源方向
    const lightDir = computeLightDirection(cachedSolar, cachedLunar)

    // Step 7: テーマ遷移
    const mergedTheme = {
      ...themeParams,
      sunPosition: lightDir.position,
      sunColor: lightDir.color,
      sunIntensity: lightDir.intensity,
    }
    themeTransitionService.transitionTo(mergedTheme, ASTRONOMY_UPDATE_INTERVAL_MS)

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
      timeSinceLastAstronomyUpdate = ASTRONOMY_UPDATE_INTERVAL_MS // 即時再計算
    },

    onScenePresetChanged(preset: ScenePresetName): void {
      scenePreset = preset
      timeSinceLastAstronomyUpdate = ASTRONOMY_UPDATE_INTERVAL_MS // 即時再計算
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
      currentWeatherDecision = null
      currentKou = null
      lastWeatherDecisionDayOfYear = -1
      timeSinceLastAstronomyUpdate = 0
    },

    get currentSolar(): SolarPosition | null { return cachedSolar },
    get currentLunar(): LunarPosition | null { return cachedLunar },
    get currentKou(): KouDefinition | null { return currentKou },
    get currentWeather(): WeatherDecision | null { return currentWeatherDecision },
    get currentEstimatedTempC(): number | null { return isRunning ? currentEstimatedTempC : null },
    get isRunning(): boolean { return isRunning },
  }
}
