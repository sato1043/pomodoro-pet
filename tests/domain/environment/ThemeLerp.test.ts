import { describe, it, expect } from 'vitest'
import {
  lerpFloat,
  lerpHexColor,
  lerpVec3,
  smoothstep,
  lerpThemeParams,
  themeParamsEqual,
  startThemeTransition,
  tickThemeTransition,
} from '../../../src/domain/environment/value-objects/ThemeLerp'
import type { EnvironmentThemeParams } from '../../../src/domain/environment/value-objects/EnvironmentTheme'

const THEME_A: EnvironmentThemeParams = {
  skyColor: 0x000000,
  fogColor: 0x000000,
  fogNear: 10,
  fogFar: 30,
  ambientColor: 0x000000,
  ambientIntensity: 0.5,
  hemiSkyColor: 0x000000,
  hemiGroundColor: 0x000000,
  hemiIntensity: 0.5,
  sunColor: 0x000000,
  sunIntensity: 0.5,
  sunPosition: { x: 0, y: 0, z: 0 },
  groundColor: 0x000000,
  exposure: 1.0,
}

const THEME_B: EnvironmentThemeParams = {
  skyColor: 0xffffff,
  fogColor: 0xffffff,
  fogNear: 20,
  fogFar: 40,
  ambientColor: 0xffffff,
  ambientIntensity: 1.0,
  hemiSkyColor: 0xffffff,
  hemiGroundColor: 0xffffff,
  hemiIntensity: 1.0,
  sunColor: 0xffffff,
  sunIntensity: 1.0,
  sunPosition: { x: 10, y: 20, z: 30 },
  groundColor: 0xffffff,
  exposure: 2.0,
}

describe('ThemeLerp', () => {
  describe('lerpFloat', () => {
    it('t=0でfrom値を返す', () => {
      expect(lerpFloat(0, 10, 0)).toBe(0)
    })

    it('t=1でto値を返す', () => {
      expect(lerpFloat(0, 10, 1)).toBe(10)
    })

    it('t=0.5で中間値を返す', () => {
      expect(lerpFloat(0, 10, 0.5)).toBe(5)
    })
  })

  describe('lerpHexColor', () => {
    it('0x000000→0xffffff at t=0.5で各チャネル≈0x80', () => {
      const result = lerpHexColor(0x000000, 0xffffff, 0.5)
      const r = (result >> 16) & 0xff
      const g = (result >> 8) & 0xff
      const b = result & 0xff
      expect(r).toBe(128)
      expect(g).toBe(128)
      expect(b).toBe(128)
    })

    it('同色→同色では変化しない', () => {
      expect(lerpHexColor(0xff8800, 0xff8800, 0.5)).toBe(0xff8800)
    })

    it('t=0でfrom色を返す', () => {
      expect(lerpHexColor(0xff0000, 0x00ff00, 0)).toBe(0xff0000)
    })

    it('t=1でto色を返す', () => {
      expect(lerpHexColor(0xff0000, 0x00ff00, 1)).toBe(0x00ff00)
    })
  })

  describe('lerpVec3', () => {
    it('各成分を補間する', () => {
      const from = { x: 0, y: 0, z: 0 }
      const to = { x: 10, y: 20, z: 30 }
      const result = lerpVec3(from, to, 0.5)
      expect(result.x).toBe(5)
      expect(result.y).toBe(10)
      expect(result.z).toBe(15)
    })
  })

  describe('smoothstep', () => {
    it('t=0で0を返す', () => {
      expect(smoothstep(0)).toBe(0)
    })

    it('t=1で1を返す', () => {
      expect(smoothstep(1)).toBe(1)
    })

    it('t=0.5で0.5を返す', () => {
      expect(smoothstep(0.5)).toBe(0.5)
    })

    it('0<t<0.5で入力より小さい値を返す（ease-in）', () => {
      expect(smoothstep(0.25)).toBeLessThan(0.25)
    })

    it('0.5<t<1で入力より大きい値を返す（ease-out）', () => {
      expect(smoothstep(0.75)).toBeGreaterThan(0.75)
    })
  })

  describe('lerpThemeParams', () => {
    it('t=0でfromと一致する', () => {
      const result = lerpThemeParams(THEME_A, THEME_B, 0)
      expect(themeParamsEqual(result, THEME_A)).toBe(true)
    })

    it('t=1でtoと一致する', () => {
      const result = lerpThemeParams(THEME_A, THEME_B, 1)
      expect(themeParamsEqual(result, THEME_B)).toBe(true)
    })

    it('t=0.5で中間値を返す', () => {
      const result = lerpThemeParams(THEME_A, THEME_B, 0.5)
      expect(result.fogNear).toBe(15)
      expect(result.fogFar).toBe(35)
      expect(result.ambientIntensity).toBe(0.75)
      expect(result.sunPosition.x).toBe(5)
    })
  })

  describe('themeParamsEqual', () => {
    it('同一パラメータでtrueを返す', () => {
      expect(themeParamsEqual(THEME_A, THEME_A)).toBe(true)
    })

    it('異なるパラメータでfalseを返す', () => {
      expect(themeParamsEqual(THEME_A, THEME_B)).toBe(false)
    })

    it('sunPositionのみ異なるときfalseを返す', () => {
      const modified = { ...THEME_A, sunPosition: { x: 1, y: 0, z: 0 } }
      expect(themeParamsEqual(THEME_A, modified)).toBe(false)
    })
  })

  describe('tickThemeTransition', () => {
    it('elapsed=0でfrom値を返す', () => {
      const state = startThemeTransition(THEME_A, THEME_B, 1000)
      const result = tickThemeTransition(state, 0)
      expect(result.status).toBe('transitioning')
      if (result.status === 'transitioning') {
        expect(themeParamsEqual(result.params, THEME_A)).toBe(true)
      }
    })

    it('elapsed≥durationでcompletedとto値を返す', () => {
      const state = startThemeTransition(THEME_A, THEME_B, 1000)
      const result = tickThemeTransition(state, 1000)
      expect(result.status).toBe('completed')
      expect(themeParamsEqual(result.params, THEME_B)).toBe(true)
    })

    it('elapsed>durationでもcompletedを返す', () => {
      const state = startThemeTransition(THEME_A, THEME_B, 1000)
      const result = tickThemeTransition(state, 5000)
      expect(result.status).toBe('completed')
      expect(themeParamsEqual(result.params, THEME_B)).toBe(true)
    })

    it('中間tickでtransitioningを返す', () => {
      const state = startThemeTransition(THEME_A, THEME_B, 1000)
      const result = tickThemeTransition(state, 500)
      expect(result.status).toBe('transitioning')
      if (result.status === 'transitioning') {
        expect(result.params.fogNear).toBeGreaterThan(THEME_A.fogNear)
        expect(result.params.fogNear).toBeLessThan(THEME_B.fogNear)
      }
    })

    it('連続tickでelapsedが蓄積する', () => {
      const state = startThemeTransition(THEME_A, THEME_B, 1000)
      const r1 = tickThemeTransition(state, 300)
      expect(r1.status).toBe('transitioning')
      if (r1.status === 'transitioning') {
        const r2 = tickThemeTransition(r1.state, 300)
        expect(r2.status).toBe('transitioning')
        if (r2.status === 'transitioning') {
          const r3 = tickThemeTransition(r2.state, 500)
          expect(r3.status).toBe('completed')
        }
      }
    })
  })
})
