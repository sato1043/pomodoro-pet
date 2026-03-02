import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateKeyPairSync, createHash } from 'crypto'

// --- テスト用RSA鍵ペア生成 ---

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

// --- モック用ストア ---

const { mockDocStore, mockSetCalls, mockUpdateCalls, mockDb } = vi.hoisted(() => {
  const mockDocStore: Record<string, { exists: boolean; data: () => any }> = {}
  const mockSetCalls: Array<{ path: string; data: any; options?: any }> = []
  const mockUpdateCalls: Array<{ path: string; data: any }> = []

  const mockDb = {
    collection: (collName: string) => ({
      doc: (docId: string) => {
        const path = `${collName}/${docId}`
        return {
          get: () => Promise.resolve(
            mockDocStore[path] ?? { exists: false, data: () => null },
          ),
          set: (data: any, options?: any) => {
            mockSetCalls.push({ path, data, options })
            return Promise.resolve()
          },
          update: (data: any) => {
            mockUpdateCalls.push({ path, data })
            return Promise.resolve()
          },
        }
      },
    }),
  }

  return { mockDocStore, mockSetCalls, mockUpdateCalls, mockDb }
})

// --- モジュールモック ---

vi.mock('@google-cloud/functions-framework', () => ({
  http: vi.fn(),
}))

vi.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: vi.fn(),
}))

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => mockDb,
  Timestamp: {
    now: () => ({ toMillis: () => Date.now() }),
  },
  FieldValue: {
    arrayRemove: (...args: any[]) => ({ __type: 'arrayRemove', args }),
    arrayUnion: (...args: any[]) => ({ __type: 'arrayUnion', args }),
  },
}))

// --- req/res ヘルパー ---

function createReq(body: Record<string, unknown>) {
  return { body } as any
}

function createRes() {
  const res: any = {
    statusCode: 200,
    body: null as any,
    status(code: number) { res.statusCode = code; return res },
    json(data: any) { res.body = data },
  }
  return res
}

// --- 定数 ---

const TEST_DEVICE_ID = 'test-device-001'
const TEST_DOWNLOAD_KEY = 'test-key-12345'
const TEST_KEY_HASH = createHash('sha256').update(TEST_DOWNLOAD_KEY).digest('hex')
const TODAY = new Date().toISOString().slice(0, 10)
const YESTERDAY = new Date(Date.now() - 86400 * 1000).toISOString().slice(0, 10)

// config/current を設定するヘルパー
function setConfig() {
  mockDocStore['config/current'] = {
    exists: true,
    data: () => ({
      latestVersion: '0.1.0',
      trialDays: 30,
      jwtExpiryDays: 30,
      serverMessage: null,
      forceUpdateBelowVersion: null,
    }),
  }
}

// 既存キーのモックを設定するヘルパー
function setKeyDoc(overrides: Record<string, unknown> = {}) {
  mockDocStore[`keys/${TEST_KEY_HASH}`] = {
    exists: true,
    data: () => ({
      devices: [],
      registerCount: 0,
      registerDate: YESTERDAY,
      totalRegistrations: 0,
      ...overrides,
    }),
  }
}

// 既存デバイスのモックを設定するヘルパー
function setDeviceDoc(deviceId: string, overrides: Record<string, unknown> = {}) {
  mockDocStore[`devices/${deviceId}`] = {
    exists: true,
    data: () => ({
      registeredKey: null,
      lastHeartbeat: { toMillis: () => Date.now() },
      ...overrides,
    }),
  }
}

// --- テスト ---

describe('handleRegister', () => {
  beforeEach(() => {
    process.env.JWT_PRIVATE_KEY = privateKey
    for (const key of Object.keys(mockDocStore)) delete mockDocStore[key]
    mockSetCalls.length = 0
    mockUpdateCalls.length = 0
    setConfig()
  })

  // --- バリデーション ---

  it('deviceIdなし → 400', async () => {
    const { handleRegister } = await import('./index')
    const res = createRes()
    await handleRegister(createReq({ downloadKey: TEST_DOWNLOAD_KEY }), res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toContain('deviceId')
  })

  it('downloadKeyなし → 400', async () => {
    const { handleRegister } = await import('./index')
    const res = createRes()
    await handleRegister(createReq({ deviceId: TEST_DEVICE_ID }), res)
    expect(res.statusCode).toBe(400)
    expect(res.body.error).toContain('downloadKey')
  })

  // --- 新規登録 ---

  it('新規デバイス + 新規キー → 成功、keys に registerCount=1 と totalRegistrations=1', async () => {
    const { handleRegister } = await import('./index')
    const res = createRes()
    await handleRegister(createReq({ deviceId: TEST_DEVICE_ID, downloadKey: TEST_DOWNLOAD_KEY }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.jwt).toBeDefined()
    expect(res.body.keyHint).toBeDefined()

    // 新規キー作成で registerCount=1, totalRegistrations=1 が書き込まれたことを確認
    const keySet = mockSetCalls.find(c => c.path === `keys/${TEST_KEY_HASH}`)
    expect(keySet).toBeDefined()
    expect(keySet!.data.registerCount).toBe(1)
    expect(keySet!.data.registerDate).toBe(TODAY)
    expect(keySet!.data.totalRegistrations).toBe(1)

    // デバイスレコード更新に registerCount がないことを確認
    const deviceUpdate = mockUpdateCalls.find(c => c.path === `devices/${TEST_DEVICE_ID}`)
    expect(deviceUpdate).toBeDefined()
    expect(deviceUpdate!.data.registerCount).toBeUndefined()
  })

  // --- 日次レート制限（キー単位） ---

  it('既存キーで同日3回目 → 成功、keys の registerCount=3', async () => {
    const { handleRegister } = await import('./index')
    setDeviceDoc(TEST_DEVICE_ID)
    setKeyDoc({ registerCount: 2, registerDate: TODAY, totalRegistrations: 2 })

    const res = createRes()
    await handleRegister(createReq({ deviceId: TEST_DEVICE_ID, downloadKey: TEST_DOWNLOAD_KEY }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)

    const keyUpdate = mockUpdateCalls.find(
      c => c.path === `keys/${TEST_KEY_HASH}` && c.data.registerCount !== undefined,
    )
    expect(keyUpdate!.data.registerCount).toBe(3)
  })

  it('既存キーで同日4回目 → 429', async () => {
    const { handleRegister } = await import('./index')
    setDeviceDoc(TEST_DEVICE_ID)
    setKeyDoc({ registerCount: 3, registerDate: TODAY, totalRegistrations: 3 })

    const res = createRes()
    await handleRegister(createReq({ deviceId: TEST_DEVICE_ID, downloadKey: TEST_DOWNLOAD_KEY }), res)

    expect(res.statusCode).toBe(429)
    expect(res.body.error).toContain('Daily registration limit reached')
  })

  it('異なるdeviceIdでも同一キーなら日次レート制限が適用される', async () => {
    const { handleRegister } = await import('./index')
    const deviceB = 'test-device-002'
    setDeviceDoc(deviceB)
    setKeyDoc({ registerCount: 3, registerDate: TODAY, totalRegistrations: 3 })

    const res = createRes()
    await handleRegister(createReq({ deviceId: deviceB, downloadKey: TEST_DOWNLOAD_KEY }), res)

    expect(res.statusCode).toBe(429)
    expect(res.body.error).toContain('Daily registration limit reached')
  })

  it('日付変更後 → カウントリセット → 成功', async () => {
    const { handleRegister } = await import('./index')
    setDeviceDoc(TEST_DEVICE_ID)
    setKeyDoc({ registerCount: 3, registerDate: YESTERDAY, totalRegistrations: 3 })

    const res = createRes()
    await handleRegister(createReq({ deviceId: TEST_DEVICE_ID, downloadKey: TEST_DOWNLOAD_KEY }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)

    // リセット後のカウント=1
    const keyUpdate = mockUpdateCalls.find(
      c => c.path === `keys/${TEST_KEY_HASH}` && c.data.registerCount !== undefined,
    )
    expect(keyUpdate!.data.registerCount).toBe(1)
    expect(keyUpdate!.data.registerDate).toBe(TODAY)
  })

  // --- 再登録（カウント消費しない） ---

  it('再登録（同キー・同デバイス） → JWT再発行、カウント消費しない', async () => {
    const { handleRegister } = await import('./index')
    setDeviceDoc(TEST_DEVICE_ID, { registeredKey: TEST_KEY_HASH, keyHint: 'test****2345' })
    setKeyDoc({
      devices: [TEST_DEVICE_ID],
      registerCount: 1,
      registerDate: TODAY,
      totalRegistrations: 1,
    })

    const res = createRes()
    await handleRegister(createReq({ deviceId: TEST_DEVICE_ID, downloadKey: TEST_DOWNLOAD_KEY }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)
    expect(res.body.jwt).toBeDefined()

    // keys/{hash} の update が呼ばれていない（カウント消費しない）
    const keyUpdate = mockUpdateCalls.find(c => c.path === `keys/${TEST_KEY_HASH}`)
    expect(keyUpdate).toBeUndefined()
    // デバイスレコードの update も呼ばれていない
    const deviceUpdate = mockUpdateCalls.find(c => c.path === `devices/${TEST_DEVICE_ID}`)
    expect(deviceUpdate).toBeUndefined()
  })

  // --- 累計登録数制限 ---

  it('累計50デバイス目 → 403', async () => {
    const { handleRegister } = await import('./index')
    setDeviceDoc(TEST_DEVICE_ID)
    setKeyDoc({ registerCount: 0, registerDate: YESTERDAY, totalRegistrations: 50 })

    const res = createRes()
    await handleRegister(createReq({ deviceId: TEST_DEVICE_ID, downloadKey: TEST_DOWNLOAD_KEY }), res)

    expect(res.statusCode).toBe(403)
    expect(res.body.error).toContain('lifetime registrations')
  })

  it('累計49デバイス目 → 成功、totalRegistrations=50', async () => {
    const { handleRegister } = await import('./index')
    setDeviceDoc(TEST_DEVICE_ID)
    setKeyDoc({ registerCount: 0, registerDate: YESTERDAY, totalRegistrations: 49 })

    const res = createRes()
    await handleRegister(createReq({ deviceId: TEST_DEVICE_ID, downloadKey: TEST_DOWNLOAD_KEY }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)

    const keyUpdate = mockUpdateCalls.find(
      c => c.path === `keys/${TEST_KEY_HASH}` && c.data.totalRegistrations !== undefined,
    )
    expect(keyUpdate!.data.totalRegistrations).toBe(50)
  })

  // --- staleデバイス除外 ---

  it('staleデバイス（30日超）が自動除外される', async () => {
    const { handleRegister } = await import('./index')
    const staleDeviceId = 'stale-device-old'
    const THIRTY_ONE_DAYS_AGO = Date.now() - 31 * 86400 * 1000

    setDeviceDoc(TEST_DEVICE_ID)
    mockDocStore[`devices/${staleDeviceId}`] = {
      exists: true,
      data: () => ({ lastHeartbeat: { toMillis: () => THIRTY_ONE_DAYS_AGO } }),
    }
    setKeyDoc({ devices: [staleDeviceId], totalRegistrations: 1 })

    const res = createRes()
    await handleRegister(createReq({ deviceId: TEST_DEVICE_ID, downloadKey: TEST_DOWNLOAD_KEY }), res)

    expect(res.statusCode).toBe(200)
    expect(res.body.success).toBe(true)

    const keyUpdates = mockUpdateCalls.filter(c => c.path === `keys/${TEST_KEY_HASH}`)
    const removeCall = keyUpdates.find(c => c.data.devices?.__type === 'arrayRemove')
    expect(removeCall).toBeDefined()
    expect(removeCall!.data.devices.args).toContain(staleDeviceId)
  })

  it('29日前のデバイスはstale除外されない', async () => {
    const { handleRegister } = await import('./index')
    const recentDeviceId = 'recent-device'
    const TWENTY_NINE_DAYS_AGO = Date.now() - 29 * 86400 * 1000

    setDeviceDoc(TEST_DEVICE_ID)
    mockDocStore[`devices/${recentDeviceId}`] = {
      exists: true,
      data: () => ({ lastHeartbeat: { toMillis: () => TWENTY_NINE_DAYS_AGO } }),
    }
    setKeyDoc({ devices: [recentDeviceId], totalRegistrations: 1 })

    const res = createRes()
    await handleRegister(createReq({ deviceId: TEST_DEVICE_ID, downloadKey: TEST_DOWNLOAD_KEY }), res)

    expect(res.statusCode).toBe(200)

    const keyUpdates = mockUpdateCalls.filter(c => c.path === `keys/${TEST_KEY_HASH}`)
    const removeCall = keyUpdates.find(c => c.data.devices?.__type === 'arrayRemove')
    expect(removeCall).toBeUndefined()
  })
})
