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

    it('seasideプリセットでgroundColorが砂色にオーバーライドされる', () => {
      const meadow = resolveEnvironmentTheme('sunny', 'day')
      const seaside = resolveEnvironmentTheme('sunny', 'day', 'seaside')
      expect(seaside.groundColor).toBe(0xd4b878)
      expect(seaside.hemiGroundColor).toBe(0xd4b878)
      // 砂色は緑色と異なる
      expect(seaside.groundColor).not.toBe(meadow.groundColor)
      // skyColorは明るくなる
      expect(seaside.skyColor).not.toBe(meadow.skyColor)
      expect(seaside.skyColor).toBeGreaterThan(meadow.skyColor)
      // seasideは輝度ブーストがかかる
      expect(seaside.sunIntensity).toBeCloseTo(meadow.sunIntensity * 1.2)
      expect(seaside.exposure).toBeCloseTo(meadow.exposure * 1.25)
      expect(seaside.ambientIntensity).toBeCloseTo(meadow.ambientIntensity * 1.15)
    })

    it('seasideプリセットの全16パターンでgroundColorが有効値', () => {
      for (const weather of WEATHER_TYPES) {
        for (const timeOfDay of TIME_OF_DAYS) {
          const params = resolveEnvironmentTheme(weather, timeOfDay, 'seaside')
          expect(params.groundColor).toBeTypeOf('number')
          expect(params.groundColor).toBeGreaterThan(0)
          expect(params.hemiGroundColor).toBe(params.groundColor)
        }
      }
    })

    it('seasideプリセットの全16パターンでskyColorが基準より明るい', () => {
      for (const weather of WEATHER_TYPES) {
        for (const timeOfDay of TIME_OF_DAYS) {
          const base = resolveEnvironmentTheme(weather, timeOfDay)
          const seaside = resolveEnvironmentTheme(weather, timeOfDay, 'seaside')
          expect(seaside.skyColor).toBeGreaterThanOrEqual(base.skyColor)
          expect(seaside.fogColor).toBeGreaterThanOrEqual(base.fogColor)
          expect(seaside.hemiSkyColor).toBeGreaterThanOrEqual(base.hemiSkyColor)
        }
      }
    })

    it('meadow/parkプリセットではskyColor/groundColorがオーバーライドされない', () => {
      const base = resolveEnvironmentTheme('sunny', 'day')
      const meadow = resolveEnvironmentTheme('sunny', 'day', 'meadow')
      const park = resolveEnvironmentTheme('sunny', 'day', 'park')
      expect(meadow.groundColor).toBe(base.groundColor)
      expect(park.groundColor).toBe(base.groundColor)
      expect(meadow.skyColor).toBe(base.skyColor)
      expect(park.skyColor).toBe(base.skyColor)
    })
  })
})
