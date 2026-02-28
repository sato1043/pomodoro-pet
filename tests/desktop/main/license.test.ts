import { vi, describe, it, expect, beforeEach } from 'vitest'

// electron モック（モジュール読み込み時に必要）
vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0',
    getPath: () => '/tmp/test-pomodoro-pet',
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
}))

import {
  decodeJwtPayload,
  verifyJwt,
  getLicenseState,
  setLicenseState,
} from '../../../desktop/main/license'
import type { LicenseState } from '../../../desktop/main/types'

// --- テストヘルパー ---

function encodeBase64url(obj: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

function buildToken(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  signature = 'fake-signature',
): string {
  return `${encodeBase64url(header)}.${encodeBase64url(payload)}.${Buffer.from(signature).toString('base64url')}`
}

const VALID_HEADER = { alg: 'RS256', typ: 'JWT' }
const VALID_PAYLOAD = {
  deviceId: 'test-device-id',
  keyHint: 'abc1',
  iat: 1700000000,
  exp: 1700086400,
}

// --- テスト ---

describe('decodeJwtPayload', () => {
  it('有効なJWTからペイロードをデコードする', () => {
    const token = buildToken(VALID_HEADER, VALID_PAYLOAD)
    const result = decodeJwtPayload(token)

    expect(result).toEqual(VALID_PAYLOAD)
  })

  it('ペイロードの全フィールドが正しく取得できる', () => {
    const token = buildToken(VALID_HEADER, VALID_PAYLOAD)
    const result = decodeJwtPayload(token)

    expect(result?.deviceId).toBe('test-device-id')
    expect(result?.keyHint).toBe('abc1')
    expect(result?.iat).toBe(1700000000)
    expect(result?.exp).toBe(1700086400)
  })

  it('空文字列 → null', () => {
    expect(decodeJwtPayload('')).toBeNull()
  })

  it('ドットなし（パート1つ） → null', () => {
    expect(decodeJwtPayload('single-segment')).toBeNull()
  })

  it('ドット1つ（パート2つ） → null', () => {
    expect(decodeJwtPayload('part1.part2')).toBeNull()
  })

  it('ドット3つ（パート4つ） → null', () => {
    expect(decodeJwtPayload('a.b.c.d')).toBeNull()
  })

  it('ペイロード部分が不正なbase64url → null', () => {
    const header = encodeBase64url(VALID_HEADER)
    expect(decodeJwtPayload(`${header}.!!!invalid!!!.sig`)).toBeNull()
  })

  it('ペイロード部分が有効なbase64urlだがJSON無効 → null', () => {
    const header = encodeBase64url(VALID_HEADER)
    const notJson = Buffer.from('not-json').toString('base64url')
    expect(decodeJwtPayload(`${header}.${notJson}.sig`)).toBeNull()
  })

  it('署名部分の内容にかかわらずペイロードをデコードする', () => {
    const token = buildToken(VALID_HEADER, VALID_PAYLOAD, '')
    const result = decodeJwtPayload(token)
    expect(result).toEqual(VALID_PAYLOAD)
  })
})

describe('verifyJwt', () => {
  it('空文字列 → null', () => {
    expect(verifyJwt('')).toBeNull()
  })

  it('パートが3つでない → null', () => {
    expect(verifyJwt('one.two')).toBeNull()
    expect(verifyJwt('one.two.three.four')).toBeNull()
  })

  it('正しい形式だが署名が不正 → null', () => {
    const token = buildToken(VALID_HEADER, VALID_PAYLOAD, 'wrong-signature')
    expect(verifyJwt(token)).toBeNull()
  })

  it('ペイロード改竄（署名不一致） → null', () => {
    const token = buildToken(VALID_HEADER, VALID_PAYLOAD)
    // ペイロード部分を別の値に差し替え
    const parts = token.split('.')
    const tampered = encodeBase64url({ ...VALID_PAYLOAD, deviceId: 'tampered' })
    const tamperedToken = `${parts[0]}.${tampered}.${parts[2]}`
    expect(verifyJwt(tamperedToken)).toBeNull()
  })

  it('署名部分が不正なbase64url → null', () => {
    const header = encodeBase64url(VALID_HEADER)
    const payload = encodeBase64url(VALID_PAYLOAD)
    expect(verifyJwt(`${header}.${payload}.!!!`)).toBeNull()
  })
})

describe('getLicenseState / setLicenseState', () => {
  beforeEach(() => {
    // 各テスト前に初期状態（trial）にリセット
    setLicenseState({ mode: 'trial' })
  })

  it('初期状態はtrial（__DEBUG_LICENSE__が空の場合）', () => {
    const state = getLicenseState()
    expect(state.mode).toBe('trial')
  })

  it('registeredに設定 → registeredを返す', () => {
    const newState: LicenseState = {
      mode: 'registered',
      keyHint: 'xyz9',
    }
    setLicenseState(newState)
    expect(getLicenseState()).toEqual(newState)
  })

  it('expiredに設定 → expiredを返す', () => {
    const newState: LicenseState = {
      mode: 'expired',
      serverMessage: 'Trial period has ended',
    }
    setLicenseState(newState)
    expect(getLicenseState()).toEqual(newState)
  })

  it('restrictedに設定 → restrictedを返す', () => {
    const newState: LicenseState = { mode: 'restricted' }
    setLicenseState(newState)
    expect(getLicenseState()).toEqual(newState)
  })

  it('上書き → 最新の状態のみ返す', () => {
    setLicenseState({ mode: 'registered', keyHint: 'first' })
    setLicenseState({ mode: 'expired', serverMessage: 'second' })
    const state = getLicenseState()
    expect(state.mode).toBe('expired')
    expect(state.serverMessage).toBe('second')
    expect(state.keyHint).toBeUndefined()
  })

  it('全フィールドを含むregistered状態を保持する', () => {
    const fullState: LicenseState = {
      mode: 'registered',
      keyHint: 'full-key',
      serverMessage: 'Welcome',
      latestVersion: '2.0.0',
      updateAvailable: true,
    }
    setLicenseState(fullState)
    expect(getLicenseState()).toEqual(fullState)
  })

  it('全フィールドを含むtrial状態を保持する', () => {
    const trialState: LicenseState = {
      mode: 'trial',
      trialDaysRemaining: 5,
      serverMessage: '5 days left',
      latestVersion: '1.2.0',
      updateAvailable: false,
    }
    setLicenseState(trialState)
    expect(getLicenseState()).toEqual(trialState)
  })
})
