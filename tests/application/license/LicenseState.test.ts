import { describe, it, expect } from 'vitest'
import {
  resolveLicenseMode,
  isFeatureEnabled,
  isFeatureInChannel,
  getFeatureChannel,
  resolveReleaseChannel,
  needsHeartbeat,
  type LicenseContext,
  type LicenseMode,
  type FeatureName,
  type ReleaseChannel,
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
    'gallery',
    'weatherSettings',
    'soundSettings',
    'backgroundNotify',
    'emotionAccumulation',
    'autoUpdate',
    'biorhythm',
    'dataExportImport',
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

  const TRIAL_RESTRICTED: FeatureName[] = ['fureai', 'gallery', 'biorhythm', 'dataExportImport']
  const TRIAL_ENABLED: FeatureName[] = ALL_FEATURES.filter(
    f => !TRIAL_RESTRICTED.includes(f)
  )

  describe('trialモード', () => {
    it.each(TRIAL_ENABLED)('%s が利用可能', (feature) => {
      expect(isFeatureEnabled('trial', feature)).toBe(true)
    })

    it.each(TRIAL_RESTRICTED)('%s が利用不可', (feature) => {
      expect(isFeatureEnabled('trial', feature)).toBe(false)
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

// --- resolveReleaseChannel ---

describe('resolveReleaseChannel', () => {
  it.each<[string | undefined, ReleaseChannel]>([
    ['stable', 'stable'],
    ['beta', 'beta'],
    ['alpha', 'alpha'],
  ])('"%s" → %s', (raw, expected) => {
    expect(resolveReleaseChannel(raw)).toBe(expected)
  })

  it.each<string | undefined>([
    undefined,
    '',
    'unknown',
    'STABLE',
    'Alpha',
    'release',
  ])('不正値 "%s" → stable にフォールバック', (raw) => {
    expect(resolveReleaseChannel(raw)).toBe('stable')
  })
})

// --- getFeatureChannel ---

describe('getFeatureChannel', () => {
  it('既存の全機能は stable チャネル', () => {
    const ALL_FEATURES: FeatureName[] = [
      'pomodoroTimer', 'timerSettings', 'character', 'stats', 'fureai',
      'gallery', 'weatherSettings', 'soundSettings', 'backgroundNotify',
      'emotionAccumulation', 'autoUpdate', 'biorhythm', 'dataExportImport',
    ]
    for (const feature of ALL_FEATURES) {
      expect(getFeatureChannel(feature)).toBe('stable')
    }
  })
})

// --- isFeatureInChannel ---

describe('isFeatureInChannel', () => {
  it('stable機能はstableチャネルで利用可能', () => {
    expect(isFeatureInChannel('pomodoroTimer', 'stable')).toBe(true)
  })

  it('stable機能はbetaチャネルで利用可能', () => {
    expect(isFeatureInChannel('pomodoroTimer', 'beta')).toBe(true)
  })

  it('stable機能はalphaチャネルで利用可能', () => {
    expect(isFeatureInChannel('pomodoroTimer', 'alpha')).toBe(true)
  })
})

// --- isFeatureEnabled（チャネル統合テスト） ---

describe('isFeatureEnabled（チャネル統合）', () => {
  it('channel省略時はstableとして動作する（後方互換）', () => {
    expect(isFeatureEnabled('registered', 'pomodoroTimer')).toBe(true)
    expect(isFeatureEnabled('trial', 'fureai')).toBe(false)
  })

  it('stable機能 + stableチャネル + registered → true', () => {
    expect(isFeatureEnabled('registered', 'pomodoroTimer', 'stable')).toBe(true)
  })

  it('stable機能 + alphaチャネル + registered → true', () => {
    expect(isFeatureEnabled('registered', 'fureai', 'alpha')).toBe(true)
  })

  it('stable機能 + stableチャネル + expired → ライセンス判定に従う', () => {
    expect(isFeatureEnabled('expired', 'pomodoroTimer', 'stable')).toBe(true)
    expect(isFeatureEnabled('expired', 'stats', 'stable')).toBe(false)
  })
})
