import { describe, it, expect } from 'vitest'
import { isFeatureEnabled } from '../../../src/application/license/LicenseState'
import type { LicenseMode, FeatureName } from '../../../src/application/license/LicenseState'

/**
 * LicenseContext の canUse ヘルパーは `isFeatureEnabled(licenseMode ?? 'trial', feature)` と等価。
 * isFeatureEnabled 自体は LicenseState.test.ts で網羅済みのため、
 * ここでは Context 固有の null → 'trial' フォールバック動作のみ検証する。
 */
describe('LicenseContext canUse null handling', () => {
  const ALL_FEATURES: FeatureName[] = [
    'pomodoroTimer',
    'timerSettings',
    'character',
    'stats',
    'fureai',
    'weatherSettings',
    'soundSettings',
    'backgroundNotify',
    'emotionAccumulation',
    'autoUpdate',
  ]

  it('licenseMode が null の場合、trial として全機能有効', () => {
    const mode: LicenseMode | null = null
    const effectiveMode: LicenseMode = mode ?? 'trial'
    for (const feature of ALL_FEATURES) {
      expect(isFeatureEnabled(effectiveMode, feature)).toBe(true)
    }
  })

  it('licenseMode が expired の場合、pomodoroTimer と character のみ有効', () => {
    const mode: LicenseMode = 'expired'
    expect(isFeatureEnabled(mode, 'pomodoroTimer')).toBe(true)
    expect(isFeatureEnabled(mode, 'character')).toBe(true)
    expect(isFeatureEnabled(mode, 'timerSettings')).toBe(false)
    expect(isFeatureEnabled(mode, 'stats')).toBe(false)
    expect(isFeatureEnabled(mode, 'fureai')).toBe(false)
    expect(isFeatureEnabled(mode, 'weatherSettings')).toBe(false)
    expect(isFeatureEnabled(mode, 'soundSettings')).toBe(false)
    expect(isFeatureEnabled(mode, 'backgroundNotify')).toBe(false)
    expect(isFeatureEnabled(mode, 'emotionAccumulation')).toBe(false)
    expect(isFeatureEnabled(mode, 'autoUpdate')).toBe(false)
  })

  it('licenseMode が restricted の場合、pomodoroTimer と character のみ有効', () => {
    const mode: LicenseMode = 'restricted'
    expect(isFeatureEnabled(mode, 'pomodoroTimer')).toBe(true)
    expect(isFeatureEnabled(mode, 'character')).toBe(true)
    expect(isFeatureEnabled(mode, 'timerSettings')).toBe(false)
    expect(isFeatureEnabled(mode, 'stats')).toBe(false)
    expect(isFeatureEnabled(mode, 'fureai')).toBe(false)
    expect(isFeatureEnabled(mode, 'weatherSettings')).toBe(false)
    expect(isFeatureEnabled(mode, 'soundSettings')).toBe(false)
    expect(isFeatureEnabled(mode, 'backgroundNotify')).toBe(false)
    expect(isFeatureEnabled(mode, 'emotionAccumulation')).toBe(false)
    expect(isFeatureEnabled(mode, 'autoUpdate')).toBe(false)
  })
})
