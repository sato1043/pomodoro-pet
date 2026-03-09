import { describe, it, expect } from 'vitest'
import {
  mulberry32,
  decideWeather,
  computeParticleCount,
  cloudDensityToLevel,
} from '../../../src/domain/environment/value-objects/WeatherDecision'
import type { KouClimate } from '../../../src/domain/environment/value-objects/ClimateData'

const makeKouClimate = (overrides: Partial<KouClimate> = {}): KouClimate => ({
  kouIndex: 0,
  avgTempC: 15,
  avgHighTempC: 20,
  avgLowTempC: 10,
  avgHumidity: 60,
  precipProbability: 0.3,
  avgPrecipMm: 30,
  ...overrides,
})

describe('mulberry32', () => {
  it('同一seedで同一結果（決定的）', () => {
    expect(mulberry32(42)).toBe(mulberry32(42))
  })

  it('異なるseedで異なる結果', () => {
    expect(mulberry32(1)).not.toBe(mulberry32(2))
  })

  it('出力は0.0-1.0の範囲', () => {
    for (let i = 0; i < 100; i++) {
      const v = mulberry32(i * 1000)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('decideWeather', () => {
  it('seed < precipProbability → 降水', () => {
    const climate = makeKouClimate({ precipProbability: 0.5 })
    const result = decideWeather(climate, 15, 0.3)  // 0.3 < 0.5
    expect(result.weather).toBe('rainy')
    expect(result.precipIntensity).toBeGreaterThan(0)
  })

  it('低気温+降水 → 雪', () => {
    const climate = makeKouClimate({ precipProbability: 0.5 })
    const result = decideWeather(climate, -5, 0.3)
    expect(result.weather).toBe('snowy')
  })

  it('seed > precipProbability → 降水なし', () => {
    const climate = makeKouClimate({ precipProbability: 0.2 })
    const result = decideWeather(climate, 20, 0.5)  // 0.5 > 0.2
    expect(['sunny', 'cloudy']).toContain(result.weather)
    expect(result.precipIntensity).toBe(0)
  })

  it('乾燥地域は晴れになりやすい', () => {
    const climate = makeKouClimate({ precipProbability: 0.05, avgHumidity: 30 })
    const result = decideWeather(climate, 25, 0.8)
    expect(result.weather).toBe('sunny')
    expect(result.cloudDensity).toBeLessThan(0.3)
  })

  it('降水時cloudDensityは0.7以上', () => {
    const climate = makeKouClimate({ precipProbability: 0.8 })
    const result = decideWeather(climate, 15, 0.3)
    expect(result.cloudDensity).toBeGreaterThanOrEqual(0.7)
  })

  it('気温2度境界: 2度以上は雨、2度未満は雪', () => {
    const climate = makeKouClimate({ precipProbability: 0.8 })
    const atTwo = decideWeather(climate, 2, 0.3)
    const belowTwo = decideWeather(climate, 1.9, 0.3)
    expect(atTwo.weather).toBe('rainy')
    expect(belowTwo.weather).toBe('snowy')
  })

  it('中間precipIntensity: avgPrecipMm=37.5→precipIntensity=0.25', () => {
    // dailyPrecipMm = 37.5 / 5 = 7.5, precipIntensity = 7.5 / 30 = 0.25
    const climate = makeKouClimate({ precipProbability: 0.8, avgPrecipMm: 37.5 })
    const result = decideWeather(climate, 15, 0.3)
    expect(result.precipIntensity).toBeCloseTo(0.25, 2)
  })

  it('高precipIntensity: avgPrecipMm=137.5→precipIntensity≈0.917(クランプ前)', () => {
    // dailyPrecipMm = 137.5 / 5 = 27.5, precipIntensity = 27.5 / 30 ≈ 0.917
    const climate = makeKouClimate({ precipProbability: 0.8, avgPrecipMm: 137.5 })
    const result = decideWeather(climate, 15, 0.3)
    expect(result.precipIntensity).toBeCloseTo(0.917, 2)
  })

  it('高湿度(>70)+secondaryRand<0.4で曇り', () => {
    // avgHumidity=80 > 70で曇り判定条件を満たす
    // mulberry32(seed * 2654435761)が0.4未満になるseedを探す
    const climate = makeKouClimate({ precipProbability: 0.05, avgHumidity: 80 })
    // 降水なし(seed > precipProb)かつ曇り判定に入るseedを網羅的に確認
    let foundCloudy = false
    for (let seed = 50; seed < 200; seed++) {
      const normalizedSeed = seed / 1000
      if (normalizedSeed >= climate.precipProbability) {
        const result = decideWeather(climate, 20, normalizedSeed)
        if (result.weather === 'cloudy') {
          foundCloudy = true
          expect(result.cloudDensity).toBeGreaterThanOrEqual(0.3)
          break
        }
      }
    }
    expect(foundCloudy).toBe(true)
  })
})

describe('computeParticleCount', () => {
  it('雨: precipIntensity=0.0 → 100粒子', () => {
    expect(computeParticleCount('rainy', 0.0)).toBe(100)
  })

  it('雨: precipIntensity=1.0 → 1200粒子', () => {
    expect(computeParticleCount('rainy', 1.0)).toBe(1200)
  })

  it('雪: precipIntensity=0.0 → 100粒子', () => {
    expect(computeParticleCount('snowy', 0.0)).toBe(100)
  })

  it('雪: precipIntensity=1.0 → 900粒子', () => {
    expect(computeParticleCount('snowy', 1.0)).toBe(900)
  })

  it('雨: precipIntensity=0.5 → 650粒子（現行値相当）', () => {
    expect(computeParticleCount('rainy', 0.5)).toBe(650)
  })

  it('範囲外は安全にクランプ', () => {
    expect(computeParticleCount('rainy', -1)).toBe(100)
    expect(computeParticleCount('rainy', 2)).toBe(1200)
  })
})

describe('cloudDensityToLevel', () => {
  it('0.0 → Level 0', () => {
    expect(cloudDensityToLevel(0)).toBe(0)
  })

  it('1.0 → Level 5', () => {
    expect(cloudDensityToLevel(1.0)).toBe(5)
  })

  it('0.5 → Level 2 or 3', () => {
    const level = cloudDensityToLevel(0.5)
    expect(level).toBeGreaterThanOrEqual(2)
    expect(level).toBeLessThanOrEqual(3)
  })

  it('範囲外は安全にクランプ', () => {
    expect(cloudDensityToLevel(-1)).toBe(0)
    expect(cloudDensityToLevel(2)).toBe(5)
  })
})
