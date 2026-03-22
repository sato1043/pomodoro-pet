import { describe, it, expect } from 'vitest'
import {
  celestialToScene,
  computeMoonSunAngle,
  DEFAULT_CELESTIAL_MAPPING,
  type CelestialCoordinate,
  type CelestialMapping,
} from '../../../src/domain/environment/value-objects/CelestialMapping'

describe('celestialToScene', () => {
  const mapping = DEFAULT_CELESTIAL_MAPPING // viewDirection=180, azimuthCompression=0.5

  describe('viewDirection=180 (カメラは天球の南を向く)', () => {
    it('天球の南(az=180°)がシーンの-z方向（カメラ正面）にマップされる', () => {
      const coord: CelestialCoordinate = { azimuth: 180, altitude: 0 }
      const result = celestialToScene(coord, mapping)
      // sceneAz = (180 - 180) * 0.5 = 0° → x=0, z=-1
      expect(result.x).toBeCloseTo(0, 5)
      expect(result.y).toBeCloseTo(0, 5)
      expect(result.z).toBeCloseTo(-1, 5)
    })

    it('天球の東(az=90°)がシーンの+x方向（画面右）にマップされる', () => {
      const coord: CelestialCoordinate = { azimuth: 90, altitude: 0 }
      const result = celestialToScene(coord, mapping)
      // sceneAz = (90 - 180) * 0.5 = -45° → x=sin(45°), z=-cos(45°)
      expect(result.x).toBeCloseTo(Math.sin(45 * Math.PI / 180), 5)
      expect(result.y).toBeCloseTo(0, 5)
      expect(result.z).toBeCloseTo(-Math.cos(45 * Math.PI / 180), 5)
    })

    it('天球の西(az=270°)がシーンの-x方向（画面左）にマップされる', () => {
      const coord: CelestialCoordinate = { azimuth: 270, altitude: 0 }
      const result = celestialToScene(coord, mapping)
      // sceneAz = (270 - 180) * 0.5 = 45° → x=-sin(45°), z=-cos(45°)
      expect(result.x).toBeCloseTo(-Math.sin(45 * Math.PI / 180), 5)
      expect(result.y).toBeCloseTo(0, 5)
      expect(result.z).toBeCloseTo(-Math.cos(45 * Math.PI / 180), 5)
    })

    it('天球の北(az=0°)がシーンの+z方向（カメラ背面）にマップされる', () => {
      const coord: CelestialCoordinate = { azimuth: 0, altitude: 0 }
      const result = celestialToScene(coord, mapping)
      // sceneAz = (0 - 180) * 0.5 = -90° → x=sin(90°)=1, z=-cos(90°)=0
      expect(result.x).toBeCloseTo(1, 5)
      expect(result.y).toBeCloseTo(0, 5)
      expect(result.z).toBeCloseTo(0, 5)
    })
  })

  describe('高度', () => {
    it('高度60°の天体はy成分が正になる', () => {
      const coord: CelestialCoordinate = { azimuth: 180, altitude: 60 }
      const result = celestialToScene(coord, mapping)
      expect(result.y).toBeCloseTo(Math.sin(60 * Math.PI / 180), 5)
      // xz平面成分はcos(60°)でスケール
      expect(result.z).toBeCloseTo(-Math.cos(60 * Math.PI / 180), 5)
    })

    it('高度90°（天頂）の天体はy=1, x≈0, z≈0になる', () => {
      const coord: CelestialCoordinate = { azimuth: 180, altitude: 90 }
      const result = celestialToScene(coord, mapping)
      expect(result.y).toBeCloseTo(1, 5)
      expect(Math.abs(result.x)).toBeLessThan(0.0001)
      expect(Math.abs(result.z)).toBeLessThan(0.0001)
    })
  })

  describe('方位圧縮', () => {
    it('圧縮率1.0では方位角がそのままマップされる', () => {
      const noCompression: CelestialMapping = { viewDirection: 180, azimuthCompression: 1.0 }
      const coord: CelestialCoordinate = { azimuth: 90, altitude: 0 }
      const result = celestialToScene(coord, noCompression)
      // sceneAz = (90 - 180) * 1.0 = -90° → x=sin(90°)=1, z=0
      expect(result.x).toBeCloseTo(1, 5)
      expect(result.z).toBeCloseTo(0, 5)
    })

    it('圧縮率0.5では180°が90°に圧縮される', () => {
      const coord: CelestialCoordinate = { azimuth: 90, altitude: 0 }
      const result = celestialToScene(coord, mapping)
      // sceneAz = (90 - 180) * 0.5 = -45°
      expect(result.x).toBeCloseTo(Math.sin(45 * Math.PI / 180), 5)
    })

    it('圧縮率0.25ではさらに狭い範囲にマップされる', () => {
      const narrow: CelestialMapping = { viewDirection: 180, azimuthCompression: 0.25 }
      const coord: CelestialCoordinate = { azimuth: 90, altitude: 0 }
      const result = celestialToScene(coord, narrow)
      // sceneAz = (90 - 180) * 0.25 = -22.5°
      expect(result.x).toBeCloseTo(Math.sin(22.5 * Math.PI / 180), 5)
    })
  })

  describe('相対位置の保存', () => {
    it('太陽と月のシーン内角度差が天球上の角度差に比例する', () => {
      const sun: CelestialCoordinate = { azimuth: 180, altitude: 45 }
      const moon: CelestialCoordinate = { azimuth: 150, altitude: 30 }
      const sunScene = celestialToScene(sun, mapping)
      const moonScene = celestialToScene(moon, mapping)
      // 太陽はx≈0付近、月はx>0（東寄り）に来る
      expect(moonScene.x).toBeGreaterThan(sunScene.x)
    })
  })

  describe('結果は単位ベクトル', () => {
    it('返り値の長さは1.0である', () => {
      const coord: CelestialCoordinate = { azimuth: 135, altitude: 40 }
      const result = celestialToScene(coord, mapping)
      const len = Math.sqrt(result.x ** 2 + result.y ** 2 + result.z ** 2)
      expect(len).toBeCloseTo(1, 5)
    })
  })
})

describe('computeMoonSunAngle', () => {
  it('太陽が月の右にある場合は正の角度', () => {
    const sunScreen = { x: 10, y: 50 }
    const moonScreen = { x: -10, y: 50 }
    const angle = computeMoonSunAngle(sunScreen, moonScreen)
    // dx=20, dy=0 → atan2(20, 0) = π/2
    expect(angle).toBeCloseTo(Math.PI / 2, 5)
  })

  it('太陽が月の上にある場合は角度0', () => {
    const sunScreen = { x: 0, y: 100 }
    const moonScreen = { x: 0, y: 50 }
    const angle = computeMoonSunAngle(sunScreen, moonScreen)
    // dx=0, dy=50 → atan2(0, 50) = 0
    expect(angle).toBeCloseTo(0, 5)
  })

  it('太陽が月の左にある場合は負の角度', () => {
    const sunScreen = { x: -10, y: 50 }
    const moonScreen = { x: 10, y: 50 }
    const angle = computeMoonSunAngle(sunScreen, moonScreen)
    // dx=-20, dy=0 → atan2(-20, 0) = -π/2
    expect(angle).toBeCloseTo(-Math.PI / 2, 5)
  })
})

describe('DEFAULT_CELESTIAL_MAPPING', () => {
  it('viewDirection=180, azimuthCompression=0.5', () => {
    expect(DEFAULT_CELESTIAL_MAPPING.viewDirection).toBe(180)
    expect(DEFAULT_CELESTIAL_MAPPING.azimuthCompression).toBe(0.5)
  })
})
