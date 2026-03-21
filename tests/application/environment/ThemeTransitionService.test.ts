import { describe, it, expect } from 'vitest'
import { createThemeTransitionService } from '../../../src/application/environment/ThemeTransitionService'
import type { EnvironmentThemeParams } from '../../../src/domain/environment/value-objects/EnvironmentTheme'
import { themeParamsEqual } from '../../../src/domain/environment/value-objects/ThemeLerp'

const MOON_DEFAULTS = {
  moonPosition: { x: 0, y: -1, z: 0 },
  moonPhaseDeg: 0,
  moonIllumination: 0,
  moonIsVisible: false,
  moonOpacity: 0,
} as const

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
  ...MOON_DEFAULTS,
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
  ...MOON_DEFAULTS,
}

const THEME_C: EnvironmentThemeParams = {
  skyColor: 0x880000,
  fogColor: 0x880000,
  fogNear: 5,
  fogFar: 50,
  ambientColor: 0x880000,
  ambientIntensity: 0.8,
  hemiSkyColor: 0x880000,
  hemiGroundColor: 0x880000,
  hemiIntensity: 0.8,
  sunColor: 0x880000,
  sunIntensity: 0.8,
  sunPosition: { x: 5, y: 5, z: 5 },
  groundColor: 0x880000,
  exposure: 1.5,
  ...MOON_DEFAULTS,
}

describe('ThemeTransitionService', () => {
  it('初期状態ではcurrentParamsがnull', () => {
    const service = createThemeTransitionService()
    expect(service.currentParams).toBeNull()
    expect(service.isTransitioning).toBe(false)
  })

  it('currentParams=nullのtransitionToは即座適用する', () => {
    const service = createThemeTransitionService()
    service.transitionTo(THEME_A, 1000)
    expect(service.isTransitioning).toBe(false)
    expect(themeParamsEqual(service.currentParams!, THEME_A)).toBe(true)
  })

  it('transitionTo後にisTransitioning===trueになる', () => {
    const service = createThemeTransitionService()
    service.applyImmediate(THEME_A)
    service.transitionTo(THEME_B, 1000)
    expect(service.isTransitioning).toBe(true)
  })

  it('tick()が補間中にパラメータを返す', () => {
    const service = createThemeTransitionService()
    service.applyImmediate(THEME_A)
    service.transitionTo(THEME_B, 1000)
    const params = service.tick(500)
    expect(params).not.toBeNull()
    expect(params!.fogNear).toBeGreaterThan(THEME_A.fogNear)
    expect(params!.fogNear).toBeLessThan(THEME_B.fogNear)
  })

  it('tick()が完了後にto値を返し、次回はnullを返す', () => {
    const service = createThemeTransitionService()
    service.applyImmediate(THEME_A)
    service.transitionTo(THEME_B, 1000)
    const params = service.tick(1000)
    expect(params).not.toBeNull()
    expect(themeParamsEqual(params!, THEME_B)).toBe(true)
    expect(service.isTransitioning).toBe(false)
    expect(service.tick(16)).toBeNull()
  })

  it('applyImmediateがtransitionをキャンセルする', () => {
    const service = createThemeTransitionService()
    service.applyImmediate(THEME_A)
    service.transitionTo(THEME_B, 1000)
    service.applyImmediate(THEME_C)
    expect(service.isTransitioning).toBe(false)
    expect(themeParamsEqual(service.currentParams!, THEME_C)).toBe(true)
    expect(service.tick(16)).toBeNull()
  })

  it('補間中に新しいtransitionToで現在値から新目標へ補間切替する', () => {
    const service = createThemeTransitionService()
    service.applyImmediate(THEME_A)
    service.transitionTo(THEME_B, 1000)
    const midParams = service.tick(500)!
    service.transitionTo(THEME_C, 1000)
    expect(service.isTransitioning).toBe(true)
    const nextParams = service.tick(1000)
    expect(nextParams).not.toBeNull()
    expect(themeParamsEqual(nextParams!, THEME_C)).toBe(true)
  })

  it('同一テーマへのtransitionToはスキップする', () => {
    const service = createThemeTransitionService()
    service.applyImmediate(THEME_A)
    service.transitionTo(THEME_A, 1000)
    expect(service.isTransitioning).toBe(false)
  })

  it('非補間時のtick()はnullを返す', () => {
    const service = createThemeTransitionService()
    service.applyImmediate(THEME_A)
    expect(service.tick(16)).toBeNull()
  })
})
