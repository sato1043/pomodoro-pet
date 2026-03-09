import { describe, it, expect } from 'vitest'
import { createAstronomyAdapter, getSolarDeclinationAndGHA } from '../../../src/infrastructure/astronomy/AstronomyAdapter'
import type { AstronomyPort } from '../../../src/domain/environment/value-objects/SolarPosition'

describe('AstronomyAdapter', () => {
  let adapter: AstronomyPort

  beforeAll(() => {
    adapter = createAstronomyAdapter()
  })

  describe('getSolarPosition', () => {
    it('東京・春分の正午で高度角≒55度、黄経≒0度', () => {
      // 2024-03-20 12:00 JST = 2024-03-20 03:00 UTC
      const date = new Date('2024-03-20T03:00:00Z')
      const result = adapter.getSolarPosition(date, 35.6762, 139.6503)

      expect(result.altitude).toBeGreaterThan(45)
      expect(result.altitude).toBeLessThan(65)
      expect(result.azimuth).toBeGreaterThan(150)
      expect(result.azimuth).toBeLessThan(210)
      // 春分点付近の黄経は0度前後（359.x度も0度付近）
      const eclDist = result.eclipticLon > 180 ? 360 - result.eclipticLon : result.eclipticLon
      expect(eclDist).toBeLessThan(5)
    })

    it('東京・夏至の正午で高度角≒78度、黄経≒90度', () => {
      // 2024-06-21 12:00 JST = 2024-06-21 03:00 UTC
      const date = new Date('2024-06-21T03:00:00Z')
      const result = adapter.getSolarPosition(date, 35.6762, 139.6503)

      expect(result.altitude).toBeGreaterThan(70)
      expect(result.altitude).toBeLessThan(85)
      expect(result.eclipticLon).toBeGreaterThan(85)
      expect(result.eclipticLon).toBeLessThan(95)
    })

    it('Reykjavik・夏至の真夜中で太陽が沈まない（白夜）', () => {
      // 2024-06-21 00:00 UTC
      const date = new Date('2024-06-21T00:00:00Z')
      const result = adapter.getSolarPosition(date, 64.1466, -21.9426)

      expect(result.altitude).toBeGreaterThan(-2)
    })

    it('高度角の範囲は-90〜90、方位角は0〜360、黄経は0〜360', () => {
      const date = new Date('2024-01-15T12:00:00Z')
      const result = adapter.getSolarPosition(date, 0, 0)

      expect(result.altitude).toBeGreaterThanOrEqual(-90)
      expect(result.altitude).toBeLessThanOrEqual(90)
      expect(result.azimuth).toBeGreaterThanOrEqual(0)
      expect(result.azimuth).toBeLessThan(360)
      expect(result.eclipticLon).toBeGreaterThanOrEqual(0)
      expect(result.eclipticLon).toBeLessThan(360)
    })
  })

  describe('getLunarPosition', () => {
    it('満月時の照度割合が0.9以上', () => {
      // 2024-02-24は満月
      const date = new Date('2024-02-24T12:00:00Z')
      const result = adapter.getLunarPosition(date, 35.6762, 139.6503)

      expect(result.illuminationFraction).toBeGreaterThan(0.9)
      expect(result.phaseDeg).toBeGreaterThan(160)
      expect(result.phaseDeg).toBeLessThan(200)
    })

    it('新月時の照度割合が0.1以下', () => {
      // 2024-03-10は新月
      const date = new Date('2024-03-10T12:00:00Z')
      const result = adapter.getLunarPosition(date, 35.6762, 139.6503)

      expect(result.illuminationFraction).toBeLessThan(0.1)
    })

    it('isAboveHorizonが高度角と整合する', () => {
      const date = new Date('2024-06-15T20:00:00Z')
      const result = adapter.getLunarPosition(date, 35.6762, 139.6503)

      expect(result.isAboveHorizon).toBe(result.altitude > 0)
    })
  })

  describe('searchSunLongitude', () => {
    it('春分点（黄経0度）の日時を探索できる', () => {
      const startDate = new Date('2024-03-01T00:00:00Z')
      const result = adapter.searchSunLongitude(0, startDate, 30)

      expect(result).not.toBeNull()
      if (result) {
        // 2024年の春分は3月20日
        expect(result.getUTCMonth()).toBe(2) // 0-based: March=2
        expect(result.getUTCDate()).toBeGreaterThanOrEqual(19)
        expect(result.getUTCDate()).toBeLessThanOrEqual(21)
      }
    })

    it('探索範囲外ではnullを返す', () => {
      // 夏至(90度)を1月から5日間だけ探索 → 見つからない
      const startDate = new Date('2024-01-01T00:00:00Z')
      const result = adapter.searchSunLongitude(90, startDate, 5)

      expect(result).toBeNull()
    })
  })
})

describe('getSolarDeclinationAndGHA', () => {
  it('春分の正午UTCで赤緯≒0度、GHA≒0度', () => {
    const date = new Date('2024-03-20T12:00:00Z')
    const { declination, gha } = getSolarDeclinationAndGHA(date)

    expect(declination).toBeGreaterThan(-2)
    expect(declination).toBeLessThan(2)
    // 正午UTCでは太陽はグリニッジ子午線のほぼ真上（均時差で数度ずれる）
    // GHAは0度付近 or 360度付近
    const normalizedGha = gha > 180 ? 360 - gha : gha
    expect(normalizedGha).toBeLessThan(15)
  })

  it('夏至で赤緯≒23.44度', () => {
    const date = new Date('2024-06-21T12:00:00Z')
    const { declination } = getSolarDeclinationAndGHA(date)

    expect(declination).toBeGreaterThan(22)
    expect(declination).toBeLessThan(24)
  })
})
