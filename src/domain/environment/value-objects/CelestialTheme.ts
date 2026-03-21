import type { EnvironmentThemeParams } from './EnvironmentTheme'
import { lightenColor } from './EnvironmentTheme'
import type { SolarPosition, LunarPosition } from './SolarPosition'
import type { WeatherType } from './WeatherConfig'
import type { ScenePresetName } from './ScenePreset'
import type { WeatherDecision } from './WeatherDecision'
import { lerpFloat, lerpHexColor } from './ThemeLerp'
import { temperatureToGroundColor } from './ClimateData'

// --- ヘルパー ---

/** 範囲指定smoothstep: edge0→edge1の範囲でtを0→1に変換しsmoothstep適用 */
function rangedSmoothstep(t: number, edge0: number, edge1: number): number {
  const x = Math.max(0, Math.min(1, (t - edge0) / (edge1 - edge0)))
  return x * x * (3 - 2 * x)
}

// --- 定数テーブル ---

const WEATHER_DIMMING: Record<WeatherType, number> = {
  sunny: 1.0, cloudy: 0.7, rainy: 0.5, snowy: 0.55,
}

const PEAK_SUN_INTENSITY: Record<WeatherType, number> = {
  sunny: 2.5, cloudy: 1.2, rainy: 0.8, snowy: 0.9,
}

const MOONLIGHT_COLOR = 0x8899bb
const STARLIGHT_COLOR = 0x1a1a2e
const FULL_MOON_TINT  = 0xaabbcc

const MOON_WEATHER_DIMMING: Record<WeatherType, number> = {
  sunny: 1.0, cloudy: 0.4, rainy: 0.1, snowy: 0.1,
}

// --- 色テーブル ---

/** ブレークポイント列を線形補間するヘルパー */
function interpolateColorTable(
  table: { alt: number; color: number }[],
  altitude: number
): number {
  if (altitude <= table[0].alt) return table[0].color
  for (let i = 1; i < table.length; i++) {
    if (altitude <= table[i].alt) {
      const t = (altitude - table[i - 1].alt) / (table[i].alt - table[i - 1].alt)
      return lerpHexColor(table[i - 1].color, table[i].color, t)
    }
  }
  return table[table.length - 1].color
}

/** 太陽高度角→太陽色 */
export function altitudeToSunColor(altitude: number): number {
  if (altitude <= 0) return 0x000000
  if (altitude <= 5) return lerpHexColor(0xff4400, 0xff8844, altitude / 5)
  if (altitude <= 15) return lerpHexColor(0xff8844, 0xffcc88, (altitude - 5) / 10)
  if (altitude <= 30) return lerpHexColor(0xffcc88, 0xfff0d0, (altitude - 15) / 15)
  return 0xfff5e0
}

/** 太陽高度角+天気→空色 */
export function altitudeToSkyColor(altitude: number, weather: WeatherType): number {
  const sunnyColors = [
    { alt: -12, color: 0x0a0e2a },
    { alt: -6,  color: 0x1a2850 },
    { alt: 0,   color: 0xff6644 },
    { alt: 10,  color: 0xffc9a8 },
    { alt: 30,  color: 0xaaddf0 },
    { alt: 50,  color: 0x87ceeb },
  ]
  const baseColor = interpolateColorTable(sunnyColors, altitude)

  const grayTint: Record<WeatherType, { color: number; factor: number }> = {
    sunny: { color: 0, factor: 0 },
    cloudy: { color: 0x8898a8, factor: 0.3 },
    rainy:  { color: 0x506878, factor: 0.45 },
    snowy:  { color: 0x90a0b0, factor: 0.25 },
  }
  const tint = grayTint[weather]
  return tint.factor > 0 ? lerpHexColor(baseColor, tint.color, tint.factor) : baseColor
}

// --- 5.5b: 天体→明るさ ---

/** シーンプリセット補正 */
function applyPresetOverride(
  params: EnvironmentThemeParams,
  scenePreset: ScenePresetName
): EnvironmentThemeParams {
  if (scenePreset === 'seaside') {
    return {
      ...params,
      skyColor: lightenColor(params.skyColor, 0.25),
      fogColor: lightenColor(params.fogColor, 0.25),
      hemiSkyColor: lightenColor(params.hemiSkyColor, 0.25),
      exposure: params.exposure * 1.25,
      sunIntensity: params.sunIntensity * 1.2,
      ambientIntensity: params.ambientIntensity * 1.15,
    }
  }
  return params
}

/**
 * 天体位置+天気からEnvironmentThemeParamsを生成する純粋関数。
 * weatherDecisionは5.5fのdecideWeather()で事前に決定済みの値を受け取る。
 */
export function computeThemeFromCelestial(
  solar: SolarPosition,
  lunar: LunarPosition,
  weatherDecision: WeatherDecision,
  estimatedTempC: number,
  scenePreset: ScenePresetName,
  avgPrecipMm: number = 5
): EnvironmentThemeParams {
  const { altitude } = solar
  const weather = weatherDecision.weather

  // 月光パラメータ
  const baseMoonBrightness = lunar.isAboveHorizon
    ? lerpFloat(0.1, 0.8, lunar.illuminationFraction)
    : 0.1
  const moonBrightness = baseMoonBrightness * MOON_WEATHER_DIMMING[weather]

  const moonAmbient = lunar.isAboveHorizon
    ? lerpHexColor(MOONLIGHT_COLOR, FULL_MOON_TINT, lunar.illuminationFraction)
    : STARLIGHT_COLOR

  // 薄明帯クロスフェード: -6度→0度で0.0→1.0
  const twilightFactor = rangedSmoothstep(altitude, -6, 0)

  // フォグ視程係数
  const visibilityFactor: Record<WeatherType, number> = {
    sunny: 1.0, cloudy: 0.9, rainy: 0.7, snowy: 0.65,
  }

  // --- 14パラメータ導出 ---

  // 1. exposure（月光ブースト: 満月時により明るく）
  const dayExposure = lerpFloat(0.15, 1.2, rangedSmoothstep(altitude, -6, 40))
  const nightExposure = lerpFloat(0.08, 0.45, moonBrightness)
  const exposure = altitude > 0 ? dayExposure
    : altitude > -6 ? lerpFloat(nightExposure, dayExposure, twilightFactor)
    : nightExposure

  // 2. sunIntensity
  const sunIntensity = Math.max(0, Math.sin(altitude * Math.PI / 180)) * PEAK_SUN_INTENSITY[weather]

  // 3. sunColor
  const sunColor = altitudeToSunColor(altitude)

  // 4. skyColor
  const skyColor = altitudeToSkyColor(altitude, weather)

  // 5. fogColor
  const fogColor = lerpHexColor(skyColor, 0xffffff, 0.15)

  // 6-7. fogNear / fogFar
  const baseFogNear = lerpFloat(6, 15, rangedSmoothstep(altitude, -12, 30))
  const baseFogFar = lerpFloat(18, 35, rangedSmoothstep(altitude, -12, 30))
  const fogNear = baseFogNear * visibilityFactor[weather]
  const fogFar = baseFogFar * visibilityFactor[weather]

  // 8. ambientColor
  const dayAmbientColor = lerpHexColor(0xffaa66, 0xffeedd, rangedSmoothstep(altitude, 0, 30))
  const ambientColor = altitude > 0 ? dayAmbientColor
    : altitude > -6 ? lerpHexColor(moonAmbient, dayAmbientColor, twilightFactor)
    : moonAmbient

  // 9. ambientIntensity（月光ブースト: 満月時により明るく）
  const dayAmbientIntensity = lerpFloat(0.15, 0.6, rangedSmoothstep(altitude, -12, 20))
    * WEATHER_DIMMING[weather]
  const nightAmbientIntensity = lerpFloat(0.08, 0.40, moonBrightness)
  const ambientIntensity = altitude > 0 ? dayAmbientIntensity
    : altitude > -6 ? lerpFloat(nightAmbientIntensity, dayAmbientIntensity, twilightFactor)
    : nightAmbientIntensity

  // 10. hemiSkyColor = skyColor
  const hemiSkyColor = skyColor

  // 13. groundColor（夜間: 月光で地面色をMOONLIGHT_COLOR方向にブレンド）
  const baseGroundColor = temperatureToGroundColor(estimatedTempC, scenePreset, avgPrecipMm)
  const groundMoonBlend = altitude <= 0 ? moonBrightness * 0.3 : 0
  const groundColor = groundMoonBlend > 0
    ? lerpHexColor(baseGroundColor, MOONLIGHT_COLOR, groundMoonBlend)
    : baseGroundColor

  // 11. hemiGroundColor = groundColor
  const hemiGroundColor = groundColor

  // 12. hemiIntensity
  const hemiIntensity = ambientIntensity * 0.85

  // 14. sunPosition: ダミー値。EnvironmentSimulationServiceでcomputeLightDirectionの結果で上書き
  const sunPosition = { x: 0, y: 10, z: 0 }

  // 15-19. 月データ5フィールド
  // azimuthをカメラ視野（北方向=350°中心）にリマップ（3Dオブジェクト表示用。ライティングは実azimuth）
  // 符号反転: 東(90°)→画面左、西(270°)→画面右（太陽の動きと一致）
  const MOON_AZ_CENTER = 0
  const MOON_AZ_RANGE = 50
  const normalizedAz = (((lunar.azimuth % 360) + 360) % 360) / 360 // 0〜1
  const displayAzimuth = MOON_AZ_CENTER - (normalizedAz - 0.5) * MOON_AZ_RANGE
  // 表示高度: 実高度を画面上半分（18°〜33°）にリマップ
  const MOON_ALT_MIN = 22
  const MOON_ALT_MAX = 36
  const clampedAlt = Math.max(0, Math.min(90, lunar.altitude))
  const displayAltitude = MOON_ALT_MIN + (MOON_ALT_MAX - MOON_ALT_MIN) * (clampedAlt / 90)
  const moonDir = celestialToDirection(displayAzimuth, displayAltitude)
  const moonDistance = 300
  const moonPosition = {
    x: moonDir.x * moonDistance,
    y: moonDir.y * moonDistance,
    z: moonDir.z * moonDistance,
  }
  const moonPhaseDeg = lunar.phaseDeg
  const moonIllumination = lunar.illuminationFraction
  const moonIsVisible = lunar.isAboveHorizon && lunar.altitude > -2
  // 水平線フェード: altitude -2°〜+5°で0→1
  const horizonFade = lunar.isAboveHorizon
    ? Math.max(0, Math.min(1, (lunar.altitude - (-2)) / (5 - (-2))))
    : 0
  const moonWeatherDim = MOON_WEATHER_DIMMING[weather]
  const moonOpacity = horizonFade * moonWeatherDim

  const params: EnvironmentThemeParams = {
    skyColor, fogColor, fogNear, fogFar,
    ambientColor, ambientIntensity,
    hemiSkyColor, hemiGroundColor, hemiIntensity,
    sunColor, sunIntensity, sunPosition,
    groundColor, exposure,
    moonPosition, moonPhaseDeg, moonIllumination, moonIsVisible, moonOpacity,
  }

  return applyPresetOverride(params, scenePreset)
}

// --- 5.5c: 天体方位→光源の向き ---

/** 方位角・高度角→3Dベクトル変換 */
export function celestialToDirection(
  azimuth: number,
  altitude: number
): { x: number; y: number; z: number } {
  const altRad = altitude * Math.PI / 180
  const azRad = azimuth * Math.PI / 180
  return {
    x: -Math.cos(altRad) * Math.sin(azRad),
    y: Math.sin(altRad),
    z: -Math.cos(altRad) * Math.cos(azRad),
  }
}

/** 太陽・月の位置からDirectionalLightのパラメータを生成 */
export function computeLightDirection(
  solar: SolarPosition,
  lunar: LunarPosition
): { position: { x: number; y: number; z: number }; color: number; intensity: number } {
  const weather: WeatherType = 'sunny' // 光方向は天気に依存しない（強度は別途computeThemeFromCelestialで計算）

  if (solar.altitude > 0) {
    // 日中: 太陽が主光源
    const position = celestialToDirection(solar.azimuth, solar.altitude)
    const color = altitudeToSunColor(solar.altitude)
    const intensity = Math.sin(solar.altitude * Math.PI / 180) * PEAK_SUN_INTENSITY[weather]
    return { position, color, intensity }
  }

  if (solar.altitude > -6) {
    // 薄明帯: 太陽光と月光のクロスフェード
    const twilightFactor = rangedSmoothstep(solar.altitude, -6, 0)

    const sunDir = celestialToDirection(solar.azimuth, Math.max(0.1, solar.altitude))
    const sunColor = altitudeToSunColor(Math.max(0.1, solar.altitude))
    const sunIntensity = twilightFactor * 0.3

    if (lunar.isAboveHorizon) {
      const moonDir = celestialToDirection(lunar.azimuth, lunar.altitude)
      const moonIntensity = lunar.illuminationFraction * 0.8 * (1 - twilightFactor)
      return {
        position: {
          x: lerpFloat(moonDir.x, sunDir.x, twilightFactor),
          y: lerpFloat(moonDir.y, sunDir.y, twilightFactor),
          z: lerpFloat(moonDir.z, sunDir.z, twilightFactor),
        },
        color: lerpHexColor(MOONLIGHT_COLOR, sunColor, twilightFactor),
        intensity: sunIntensity + moonIntensity,
      }
    }

    return { position: sunDir, color: sunColor, intensity: sunIntensity }
  }

  // 夜間
  if (lunar.isAboveHorizon) {
    const position = celestialToDirection(lunar.azimuth, lunar.altitude)
    return {
      position,
      color: MOONLIGHT_COLOR,
      intensity: lunar.illuminationFraction * 0.8,
    }
  }

  // 月も沈んでいる: 環境光のみ
  return { position: { x: 0, y: 10, z: 0 }, color: 0x000000, intensity: 0 }
}
