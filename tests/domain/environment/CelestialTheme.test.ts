import { describe, it, expect } from 'vitest'
import {
  altitudeToSunColor,
  altitudeToSkyColor,
  celestialToDirection,
  computeThemeFromCelestial,
  computeLightDirection,
} from '../../../src/domain/environment/value-objects/CelestialTheme'
import type { SolarPosition, LunarPosition } from '../../../src/domain/environment/value-objects/SolarPosition'
import type { WeatherDecision } from '../../../src/domain/environment/value-objects/WeatherDecision'

const makeSolar = (altitude: number, azimuth = 180, eclipticLon = 90): SolarPosition => ({
  altitude, azimuth, eclipticLon,
})

const makeLunar = (
  altitude: number,
  illuminationFraction: number,
  isAboveHorizon: boolean,
  azimuth = 90
): LunarPosition => ({
  altitude, azimuth, phaseDeg: illuminationFraction * 180, illuminationFraction, isAboveHorizon,
})

const sunnyWeather: WeatherDecision = { weather: 'sunny', precipIntensity: 0, cloudDensity: 0.1 }
const rainyWeather: WeatherDecision = { weather: 'rainy', precipIntensity: 0.5, cloudDensity: 0.85 }

describe('altitudeToSunColor', () => {
  it('altitude <= 0 → 黒', () => {
    expect(altitudeToSunColor(0)).toBe(0x000000)
    expect(altitudeToSunColor(-10)).toBe(0x000000)
  })

  it('altitude > 30 → ほぼ白', () => {
    expect(altitudeToSunColor(50)).toBe(0xfff5e0)
  })

  it('altitude 2.5 → 赤橙の中間', () => {
    const color = altitudeToSunColor(2.5)
    const r = (color >> 16) & 0xff
    expect(r).toBe(0xff) // 赤チャンネルは最大のまま
  })
})

describe('altitudeToSkyColor', () => {
  it('sunny・高altitude → 青空色に近い', () => {
    const color = altitudeToSkyColor(50, 'sunny')
    expect(color).toBe(0x87ceeb)
  })

  it('sunny・深夜 → 暗紺色', () => {
    const color = altitudeToSkyColor(-20, 'sunny')
    expect(color).toBe(0x0a0e2a)
  })

  it('rainy時は灰色方向にシフト', () => {
    const sunny = altitudeToSkyColor(40, 'sunny')
    const rainy = altitudeToSkyColor(40, 'rainy')
    // rainyの方が暗い/灰色い
    const sunnyR = (sunny >> 16) & 0xff
    const rainyR = (rainy >> 16) & 0xff
    expect(rainyR).toBeLessThan(sunnyR)
  })
})

describe('computeThemeFromCelestial', () => {
  it('正午の晴天: exposureが高くsunIntensityが高い', () => {
    const solar = makeSolar(60)
    const lunar = makeLunar(-30, 0.5, false)
    const result = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'meadow')

    expect(result.exposure).toBeGreaterThan(0.8)
    expect(result.sunIntensity).toBeGreaterThan(1.5)
    expect(result.skyColor).not.toBe(0)
  })

  it('深夜・月なし: exposureが低くsunIntensityが0', () => {
    const solar = makeSolar(-20)
    const lunar = makeLunar(-10, 0.5, false)
    const result = computeThemeFromCelestial(solar, lunar, sunnyWeather, 10, 'meadow')

    expect(result.exposure).toBeLessThan(0.15)
    expect(result.sunIntensity).toBe(0)
  })

  it('深夜・満月: exposureが月なしより高い', () => {
    const solar = makeSolar(-20)
    const lunarNoMoon = makeLunar(-10, 0.0, false)
    const lunarFullMoon = makeLunar(45, 1.0, true)

    const noMoon = computeThemeFromCelestial(solar, lunarNoMoon, sunnyWeather, 10, 'meadow')
    const fullMoon = computeThemeFromCelestial(solar, lunarFullMoon, sunnyWeather, 10, 'meadow')

    expect(fullMoon.exposure).toBeGreaterThan(noMoon.exposure)
  })

  it('雨天は晴天よりambientIntensityが低い', () => {
    const solar = makeSolar(45)
    const lunar = makeLunar(-10, 0.0, false)

    const sunny = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'meadow')
    const rainy = computeThemeFromCelestial(solar, lunar, rainyWeather, 20, 'meadow')

    expect(rainy.ambientIntensity).toBeLessThan(sunny.ambientIntensity)
  })

  it('seasideプリセットで明度補正がかかる', () => {
    const solar = makeSolar(45)
    const lunar = makeLunar(-10, 0.0, false)

    const meadow = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'meadow')
    const seaside = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'seaside')

    expect(seaside.exposure).toBeGreaterThan(meadow.exposure)
  })

  it('groundColorが気温に連動する', () => {
    const solar = makeSolar(45)
    const lunar = makeLunar(-10, 0.0, false)

    const hot = computeThemeFromCelestial(solar, lunar, sunnyWeather, 30, 'meadow')
    const cold = computeThemeFromCelestial(solar, lunar, sunnyWeather, -5, 'meadow')

    // 暑い→緑系、寒い→灰白系
    expect(hot.groundColor).not.toBe(cold.groundColor)
  })

  it('avgPrecipMmが地面色に影響する', () => {
    const solar = makeSolar(45)
    const lunar = makeLunar(-10, 0.0, false)

    const dry = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'meadow', 0)
    const wet = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'meadow', 15)

    // 乾燥と湿潤で異なる地面色
    expect(dry.groundColor).not.toBe(wet.groundColor)
    // 湿潤の方が緑チャンネルが高い（赤チャンネルが低い）
    const dryR = (dry.groundColor >> 16) & 0xff
    const wetR = (wet.groundColor >> 16) & 0xff
    expect(wetR).toBeLessThan(dryR)
  })

  it('avgPrecipMm省略時のデフォルト値で動作する', () => {
    const solar = makeSolar(45)
    const lunar = makeLunar(-10, 0.0, false)

    const result = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'meadow')
    expect(result.groundColor).toBeDefined()
    expect(typeof result.groundColor).toBe('number')
  })

  it('THEME_TABLE morning参照値に近い (sunny, altitude=10)', () => {
    const solar = makeSolar(10)
    const lunar = makeLunar(-10, 0.0, false)
    const result = computeThemeFromCelestial(solar, lunar, sunnyWeather, 18, 'meadow')

    // altitude=10度は朝の低い太陽。exposureは連続関数で0.3-0.8程度
    expect(result.exposure).toBeGreaterThan(0.3)
    expect(result.exposure).toBeLessThan(0.8)
  })

  it('薄明帯(-3度): 昼夜のクロスフェード中間値', () => {
    const solar = makeSolar(-3)
    const lunar = makeLunar(-10, 0.0, false)
    const result = computeThemeFromCelestial(solar, lunar, sunnyWeather, 15, 'meadow')

    // -6→0のsmoothstepで中間。完全昼(alt=40)より低く、完全夜(alt=-20)より高い
    const dayResult = computeThemeFromCelestial(makeSolar(40), lunar, sunnyWeather, 15, 'meadow')
    const nightResult = computeThemeFromCelestial(makeSolar(-20), lunar, sunnyWeather, 15, 'meadow')
    expect(result.exposure).toBeGreaterThan(nightResult.exposure)
    expect(result.exposure).toBeLessThan(dayResult.exposure)
  })

  it('薄明帯境界(-6度): ほぼ夜と同等', () => {
    const solar = makeSolar(-6)
    const lunar = makeLunar(-10, 0.0, false)
    const result = computeThemeFromCelestial(solar, lunar, sunnyWeather, 15, 'meadow')
    const nightResult = computeThemeFromCelestial(makeSolar(-20), lunar, sunnyWeather, 15, 'meadow')

    expect(result.exposure).toBeCloseTo(nightResult.exposure, 1)
  })

  it('薄明帯境界(0度): ほぼ昼低高度と同等', () => {
    const solar = makeSolar(0.1) // 0度直上
    const lunar = makeLunar(-10, 0.0, false)
    const result = computeThemeFromCelestial(solar, lunar, sunnyWeather, 15, 'meadow')

    // altitude>0の分岐に入り、dayExposureが使われる
    expect(result.exposure).toBeGreaterThan(0.15)
  })

  it('seasideプリセット: exposure, sunIntensity, ambientIntensityが増幅される', () => {
    const solar = makeSolar(45)
    const lunar = makeLunar(-10, 0.0, false)

    const meadow = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'meadow')
    const seaside = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'seaside')

    expect(seaside.exposure).toBeCloseTo(meadow.exposure * 1.25, 2)
    expect(seaside.sunIntensity).toBeCloseTo(meadow.sunIntensity * 1.2, 2)
    expect(seaside.ambientIntensity).toBeCloseTo(meadow.ambientIntensity * 1.15, 2)
  })

  it('parkプリセット: meadowと同一値（補正なし）', () => {
    const solar = makeSolar(45)
    const lunar = makeLunar(-10, 0.0, false)

    const meadow = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'meadow')
    const park = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'park')

    expect(park.exposure).toBe(meadow.exposure)
    expect(park.sunIntensity).toBe(meadow.sunIntensity)
    expect(park.ambientIntensity).toBe(meadow.ambientIntensity)
  })

  it('深夜・満月: moonPositionが天球上に計算される', () => {
    const solar = makeSolar(-20)
    const lunar = makeLunar(45, 1.0, true, 90)
    const result = computeThemeFromCelestial(solar, lunar, sunnyWeather, 10, 'meadow')

    // moonPositionは距離300の球面上
    const dist = Math.sqrt(result.moonPosition.x ** 2 + result.moonPosition.y ** 2 + result.moonPosition.z ** 2)
    expect(dist).toBeCloseTo(300, 0)
    expect(result.moonIsVisible).toBe(true)
    expect(result.moonPhaseDeg).toBe(180) // illuminationFraction=1.0 → phaseDeg=180
    expect(result.moonIllumination).toBe(1.0)
  })

  it('月が地平線下: moonIsVisible=false, moonOpacity=0', () => {
    const solar = makeSolar(-20)
    const lunar = makeLunar(-10, 0.5, false)
    const result = computeThemeFromCelestial(solar, lunar, sunnyWeather, 10, 'meadow')

    expect(result.moonIsVisible).toBe(false)
    expect(result.moonOpacity).toBe(0)
  })

  it('雨天で月のopacityが大幅に減衰する', () => {
    const solar = makeSolar(-20)
    const lunar = makeLunar(45, 1.0, true, 90)

    const sunny = computeThemeFromCelestial(solar, lunar, sunnyWeather, 10, 'meadow')
    const rainy = computeThemeFromCelestial(solar, lunar, rainyWeather, 10, 'meadow')

    expect(rainy.moonOpacity).toBeLessThan(sunny.moonOpacity)
  })

  it('満月の夜間は月光が地面色をMOONLIGHT_COLOR方向にブレンドする', () => {
    const solar = makeSolar(-20)
    const lunarNoMoon = makeLunar(-10, 0.0, false)
    const lunarFullMoon = makeLunar(45, 1.0, true)

    const noMoon = computeThemeFromCelestial(solar, lunarNoMoon, sunnyWeather, 20, 'meadow')
    const fullMoon = computeThemeFromCelestial(solar, lunarFullMoon, sunnyWeather, 20, 'meadow')

    // 満月時は地面色が変わる（moonBrightness>0のため）
    expect(fullMoon.groundColor).not.toBe(noMoon.groundColor)
  })

  it('月光ブースト: 満月nightのexposureが0.08〜0.45の範囲内', () => {
    const solar = makeSolar(-20)
    const lunar = makeLunar(45, 1.0, true)
    const result = computeThemeFromCelestial(solar, lunar, sunnyWeather, 10, 'meadow')

    // nightExposure = lerpFloat(0.08, 0.45, moonBrightness=0.8)
    expect(result.exposure).toBeGreaterThanOrEqual(0.08)
    expect(result.exposure).toBeLessThanOrEqual(0.45)
  })

  it('月光ブースト: 満月nightのambientIntensityが0.08〜0.40の範囲内', () => {
    const solar = makeSolar(-20)
    const lunar = makeLunar(45, 1.0, true)
    const result = computeThemeFromCelestial(solar, lunar, sunnyWeather, 10, 'meadow')

    expect(result.ambientIntensity).toBeGreaterThanOrEqual(0.08)
    expect(result.ambientIntensity).toBeLessThanOrEqual(0.40)
  })

  it('snowy天気: ambientIntensityがsunnyより低い', () => {
    const solar = makeSolar(45)
    const lunar = makeLunar(-10, 0.0, false)
    const snowyWeather: WeatherDecision = { weather: 'snowy', precipIntensity: 0.5, cloudDensity: 0.85 }

    const sunny = computeThemeFromCelestial(solar, lunar, sunnyWeather, 20, 'meadow')
    const snowy = computeThemeFromCelestial(solar, lunar, snowyWeather, 20, 'meadow')

    expect(snowy.ambientIntensity).toBeLessThan(sunny.ambientIntensity)
  })
})

describe('altitudeToSunColor 中間値', () => {
  it('altitude=2.5 → 赤チャンネル0xFF、緑チャンネルは中間', () => {
    const color = altitudeToSunColor(2.5)
    const r = (color >> 16) & 0xff
    const g = (color >> 8) & 0xff
    expect(r).toBe(0xff)
    // lerpHexColor(0xff4400, 0xff8844, 0.5) → 緑は0x44〜0x88の中間 = 0x66
    expect(g).toBeCloseTo(0x66, -1) // ±1の誤差許容
  })

  it('altitude=10 → 赤チャンネル0xFF、0xff8844〜0xffcc88の中間', () => {
    const color = altitudeToSunColor(10)
    const r = (color >> 16) & 0xff
    const g = (color >> 8) & 0xff
    expect(r).toBe(0xff)
    // lerpHexColor(0xff8844, 0xffcc88, 0.5) → 緑=0xaa程度
    expect(g).toBeGreaterThan(0x88)
    expect(g).toBeLessThan(0xcc)
  })
})

describe('celestialToDirection', () => {
  it('真南・高度45度', () => {
    const dir = celestialToDirection(180, 45)
    expect(dir.y).toBeCloseTo(Math.SQRT1_2, 3) // sin(45°) = √2/2
    expect(dir.z).toBeCloseTo(Math.SQRT1_2, 3) // -cos(45°)*cos(180°) = cos(45°)
    expect(Math.abs(dir.x)).toBeLessThan(0.001) // -cos(45°)*sin(180°) ≈ 0
  })

  it('天頂（高度90度）', () => {
    const dir = celestialToDirection(0, 90)
    expect(dir.y).toBeCloseTo(1, 3)
    expect(Math.abs(dir.x)).toBeLessThan(0.01)
    expect(Math.abs(dir.z)).toBeLessThan(0.01)
  })
})

describe('computeLightDirection', () => {
  it('日中: 太陽が主光源', () => {
    const solar = makeSolar(45, 180)
    const lunar = makeLunar(-10, 0.5, false)
    const result = computeLightDirection(solar, lunar)

    expect(result.intensity).toBeGreaterThan(0)
    expect(result.color).not.toBe(0x000000)
  })

  it('夜間・月あり: 月が主光源', () => {
    const solar = makeSolar(-15)
    const lunar = makeLunar(30, 0.8, true, 90)
    const result = computeLightDirection(solar, lunar)

    expect(result.intensity).toBeGreaterThan(0)
    expect(result.color).toBe(0x8899bb) // MOONLIGHT_COLOR
  })

  it('夜間・月なし: 光源なし', () => {
    const solar = makeSolar(-15)
    const lunar = makeLunar(-10, 0.0, false)
    const result = computeLightDirection(solar, lunar)

    expect(result.intensity).toBe(0)
  })

  it('薄明帯: 太陽と月の補間', () => {
    const solar = makeSolar(-3, 270) // 薄明帯
    const lunar = makeLunar(40, 0.9, true, 90)
    const result = computeLightDirection(solar, lunar)

    expect(result.intensity).toBeGreaterThan(0)
  })
})
