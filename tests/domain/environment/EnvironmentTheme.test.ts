import { describe, it, expect } from 'vitest'
import { resolveEnvironmentTheme } from '../../../src/domain/environment/value-objects/EnvironmentTheme'
import type { WeatherType, TimeOfDay } from '../../../src/domain/environment/value-objects/WeatherConfig'

describe('EnvironmentTheme', () => {
  describe('resolveEnvironmentTheme', () => {
    const WEATHER_TYPES: WeatherType[] = ['sunny', 'cloudy', 'rainy', 'snowy']
    const TIME_OF_DAYS: TimeOfDay[] = ['morning', 'day', 'evening', 'night']

    for (const weather of WEATHER_TYPES) {
      for (const timeOfDay of TIME_OF_DAYS) {
        it(`${weather}/${timeOfDay} が有効なパラメータを返す`, () => {
          const params = resolveEnvironmentTheme(weather, timeOfDay)
          expect(params.skyColor).toBeTypeOf('number')
          expect(params.fogColor).toBeTypeOf('number')
          expect(params.fogNear).toBeGreaterThan(0)
          expect(params.fogFar).toBeGreaterThan(params.fogNear)
          expect(params.ambientIntensity).toBeGreaterThan(0)
          expect(params.hemiIntensity).toBeGreaterThan(0)
          expect(params.sunIntensity).toBeGreaterThan(0)
          expect(params.sunPosition).toBeDefined()
          expect(params.groundColor).toBeTypeOf('number')
          expect(params.exposure).toBeGreaterThan(0)
        })
      }
    }

    it('sunny/day が現行ハードコード値と一致する', () => {
      const params = resolveEnvironmentTheme('sunny', 'day')
      expect(params.skyColor).toBe(0x87ceeb)
      expect(params.groundColor).toBe(0x5d8a3c)
      expect(params.ambientIntensity).toBe(0.8)
      expect(params.sunIntensity).toBe(1.2)
      expect(params.exposure).toBe(1.2)
    })

    it('cloudy/day の空色がsunny/dayより暗い', () => {
      const cloudy = resolveEnvironmentTheme('cloudy', 'day')
      const sunny = resolveEnvironmentTheme('sunny', 'day')
      expect(cloudy.skyColor).not.toBe(sunny.skyColor)
      expect(cloudy.ambientIntensity).toBeLessThanOrEqual(sunny.ambientIntensity)
    })

    it('snowy/day の地面色が白系である', () => {
      const params = resolveEnvironmentTheme('snowy', 'day')
      expect(params.groundColor).toBe(0xc0c0c8)
    })
  })
})
