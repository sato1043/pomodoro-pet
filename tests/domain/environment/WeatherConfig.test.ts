import { describe, it, expect } from 'vitest'
import {
  createDefaultWeatherConfig,
  resolveTimeOfDay,
  cloudPresetLevel,
} from '../../../src/domain/environment/value-objects/WeatherConfig'

describe('WeatherConfig', () => {
  describe('createDefaultWeatherConfig', () => {
    it('デフォルト値を返す', () => {
      const config = createDefaultWeatherConfig()
      expect(config).toEqual({
        weather: 'sunny',
        timeOfDay: 'day',
        autoWeather: false,
        autoTimeOfDay: false,
        cloudDensityLevel: 1,
      })
    })
  })

  describe('cloudPresetLevel', () => {
    it('sunny → 1', () => {
      expect(cloudPresetLevel('sunny')).toBe(1)
    })

    it('cloudy → 3', () => {
      expect(cloudPresetLevel('cloudy')).toBe(3)
    })

    it('rainy → 4', () => {
      expect(cloudPresetLevel('rainy')).toBe(4)
    })

    it('snowy → 4', () => {
      expect(cloudPresetLevel('snowy')).toBe(4)
    })
  })

  describe('resolveTimeOfDay', () => {
    it('hour=0 → night', () => {
      expect(resolveTimeOfDay(0)).toBe('night')
    })

    it('hour=4 → night', () => {
      expect(resolveTimeOfDay(4)).toBe('night')
    })

    it('hour=5 → morning', () => {
      expect(resolveTimeOfDay(5)).toBe('morning')
    })

    it('hour=8 → morning', () => {
      expect(resolveTimeOfDay(8)).toBe('morning')
    })

    it('hour=9 → day', () => {
      expect(resolveTimeOfDay(9)).toBe('day')
    })

    it('hour=16 → day', () => {
      expect(resolveTimeOfDay(16)).toBe('day')
    })

    it('hour=17 → evening', () => {
      expect(resolveTimeOfDay(17)).toBe('evening')
    })

    it('hour=19 → evening', () => {
      expect(resolveTimeOfDay(19)).toBe('evening')
    })

    it('hour=20 → night', () => {
      expect(resolveTimeOfDay(20)).toBe('night')
    })

    it('hour=23 → night', () => {
      expect(resolveTimeOfDay(23)).toBe('night')
    })
  })
})
