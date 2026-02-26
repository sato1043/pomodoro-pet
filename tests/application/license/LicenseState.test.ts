import { describe, it, expect } from 'vitest'
import {
  resolveLicenseMode,
  isFeatureEnabled,
  needsHeartbeat,
  type LicenseContext,
  type LicenseMode,
  type FeatureName,
} from '../../../src/application/license/LicenseState'

// --- テストヘルパー ---

function makeContext(overrides: Partial<LicenseContext> = {}): LicenseContext {
  return {
    online: true,
    heartbeatResponse: null,
    jwt: null,
    jwtValid: false,
    jwtDeviceMatch: false,
    jwtFresh: false,
    jwtExpired: false,
    ...overrides,
  }
}

// --- resolveLicenseMode ---

describe('resolveLicenseMode', () => {
  describe('JWTが24時間以内で有効な場合', () => {
    it('ハートビートなしでregisteredを返す', () => {
      const ctx = makeContext({
        jwt: 'valid-jwt-token',
        jwtValid: true,
        jwtDeviceMatch: true,
        jwtFresh: true,
        jwtExpired: false,
      })
      expect(resolveLicenseMode(ctx)).toBe('registered')
    })

    it('ハートビートレスポンスがあっても、freshなJWTが優先される', () => {
      const ctx = makeContext({
        jwt: 'valid-jwt-token',
        jwtValid: true,
        jwtDeviceMatch: true,
        jwtFresh: true,
        jwtExpired: false,
        heartbeatResponse: {
          registered: false,
          trialValid: true,
          trialDaysRemaining: 20,
          latestVersion: '1.0.0',
          updateAvailable: false,
        },
      })
      expect(resolveLicenseMode(ctx)).toBe('registered')
    })
  })

  describe('ハートビートレスポンスがある場合', () => {
    it('registered=trueならregisteredを返す', () => {
      const ctx = makeContext({
        heartbeatResponse: {
          registered: true,
          trialValid: false,
          trialDaysRemaining: 0,
          jwt: 'new-jwt',
          latestVersion: '1.0.0',
          updateAvailable: false,
        },
      })
      expect(resolveLicenseMode(ctx)).toBe('registered')
    })

    it('trialValid=trueならtrialを返す', () => {
      const ctx = makeContext({
        heartbeatResponse: {
          registered: false,
          trialValid: true,
          trialDaysRemaining: 25,
          latestVersion: '1.0.0',
          updateAvailable: false,
        },
      })
      expect(resolveLicenseMode(ctx)).toBe('trial')
    })

    it('registered=false, trialValid=falseならexpiredを返す', () => {
      const ctx = makeContext({
        heartbeatResponse: {
          registered: false,
          trialValid: false,
          trialDaysRemaining: 0,
          latestVersion: '1.0.0',
          updateAvailable: false,
        },
      })
      expect(resolveLicenseMode(ctx)).toBe('expired')
    })
  })

  describe('オフライン時', () => {
    it('有効なJWT+deviceId一致ならregisteredを返す', () => {
      const ctx = makeContext({
        online: false,
        jwt: 'valid-jwt-token',
        jwtValid: true,
        jwtDeviceMatch: true,
        jwtFresh: false,
        jwtExpired: false,
      })
      expect(resolveLicenseMode(ctx)).toBe('registered')
    })

    it('有効なJWT+deviceId一致+期限切れでもregisteredを返す', () => {
      const ctx = makeContext({
        online: false,
        jwt: 'valid-jwt-token',
        jwtValid: true,
        jwtDeviceMatch: true,
        jwtFresh: false,
        jwtExpired: true,
      })
      expect(resolveLicenseMode(ctx)).toBe('registered')
    })

    it('JWTなしならrestrictedを返す', () => {
      const ctx = makeContext({
        online: false,
      })
      expect(resolveLicenseMode(ctx)).toBe('restricted')
    })

    it('JWT署名無効ならrestrictedを返す', () => {
      const ctx = makeContext({
        online: false,
        jwt: 'invalid-jwt-token',
        jwtValid: false,
        jwtDeviceMatch: true,
      })
      expect(resolveLicenseMode(ctx)).toBe('restricted')
    })

    it('deviceId不一致ならrestrictedを返す', () => {
      const ctx = makeContext({
        online: false,
        jwt: 'valid-jwt-token',
        jwtValid: true,
        jwtDeviceMatch: false,
      })
      expect(resolveLicenseMode(ctx)).toBe('restricted')
    })
  })

  describe('オンライン+ハートビートなし（エラー等）', () => {
    it('有効なJWT+deviceId一致ならregisteredを返す', () => {
      const ctx = makeContext({
        online: true,
        jwt: 'valid-jwt-token',
        jwtValid: true,
        jwtDeviceMatch: true,
      })
      expect(resolveLicenseMode(ctx)).toBe('registered')
    })

    it('JWTなしならrestrictedを返す', () => {
      const ctx = makeContext({
        online: true,
      })
      expect(resolveLicenseMode(ctx)).toBe('restricted')
    })
  })
})

// --- isFeatureEnabled ---

describe('isFeatureEnabled', () => {
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

  const ALWAYS_ENABLED: FeatureName[] = [
    'pomodoroTimer',
    'character',
  ]

  const RESTRICTED_FEATURES: FeatureName[] = ALL_FEATURES.filter(
    f => !ALWAYS_ENABLED.includes(f)
  )

  describe('registeredモード', () => {
    it.each(ALL_FEATURES)('%s が利用可能', (feature) => {
      expect(isFeatureEnabled('registered', feature)).toBe(true)
    })
  })

  describe('trialモード', () => {
    it.each(ALL_FEATURES)('%s が利用可能', (feature) => {
      expect(isFeatureEnabled('trial', feature)).toBe(true)
    })
  })

  describe('expiredモード', () => {
    it.each(ALWAYS_ENABLED)('%s が利用可能', (feature) => {
      expect(isFeatureEnabled('expired', feature)).toBe(true)
    })

    it.each(RESTRICTED_FEATURES)('%s が利用不可', (feature) => {
      expect(isFeatureEnabled('expired', feature)).toBe(false)
    })
  })

  describe('restrictedモード', () => {
    it.each(ALWAYS_ENABLED)('%s が利用可能', (feature) => {
      expect(isFeatureEnabled('restricted', feature)).toBe(true)
    })

    it.each(RESTRICTED_FEATURES)('%s が利用不可', (feature) => {
      expect(isFeatureEnabled('restricted', feature)).toBe(false)
    })
  })
})

// --- needsHeartbeat ---

describe('needsHeartbeat', () => {
  it('JWTなしならtrueを返す', () => {
    expect(needsHeartbeat({
      jwt: null,
      jwtValid: false,
      jwtDeviceMatch: false,
      jwtFresh: false,
      jwtExpired: false,
    })).toBe(true)
  })

  it('JWT署名無効ならtrueを返す', () => {
    expect(needsHeartbeat({
      jwt: 'invalid',
      jwtValid: false,
      jwtDeviceMatch: true,
      jwtFresh: true,
      jwtExpired: false,
    })).toBe(true)
  })

  it('deviceId不一致ならtrueを返す', () => {
    expect(needsHeartbeat({
      jwt: 'valid',
      jwtValid: true,
      jwtDeviceMatch: false,
      jwtFresh: true,
      jwtExpired: false,
    })).toBe(true)
  })

  it('JWT期限切れならtrueを返す', () => {
    expect(needsHeartbeat({
      jwt: 'valid',
      jwtValid: true,
      jwtDeviceMatch: true,
      jwtFresh: true,
      jwtExpired: true,
    })).toBe(true)
  })

  it('JWTが古い（24時間超）ならtrueを返す', () => {
    expect(needsHeartbeat({
      jwt: 'valid',
      jwtValid: true,
      jwtDeviceMatch: true,
      jwtFresh: false,
      jwtExpired: false,
    })).toBe(true)
  })

  it('全条件満たすならfalseを返す', () => {
    expect(needsHeartbeat({
      jwt: 'valid',
      jwtValid: true,
      jwtDeviceMatch: true,
      jwtFresh: true,
      jwtExpired: false,
    })).toBe(false)
  })
})
