import * as ff from '@google-cloud/functions-framework'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore'
import { createSign, createHash } from 'crypto'

// --- Firebase 初期化 ---

if (getApps().length === 0) {
  initializeApp()
}
const db = getFirestore()

// --- 秘密鍵（--set-secrets で環境変数にマウント済み） ---

function getPrivateKey(): string {
  const key = process.env.JWT_PRIVATE_KEY
  if (!key) throw new Error('JWT_PRIVATE_KEY environment variable is not set')
  return key
}

// --- JWT 署名（RS256、Node.js crypto） ---

function base64url(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data) : data
  return buf.toString('base64url')
}

function buildKeyHint(downloadKey: string): string {
  if (downloadKey.length <= 8) return downloadKey
  return downloadKey.slice(0, 4) + '****' + downloadKey.slice(-4)
}

function signJwt(payload: Record<string, unknown>): string {
  const privateKey = getPrivateKey()
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const input = `${header}.${body}`
  const sign = createSign('RSA-SHA256')
  sign.update(input)
  const signature = sign.sign(privateKey)
  return `${input}.${base64url(signature)}`
}

// --- Firestore ヘルパー ---

async function getConfig(): Promise<{
  latestVersion: string
  trialDays: number
  jwtExpiryDays: number
  serverMessage: string | null
  forceUpdateBelowVersion: string | null
}> {
  const doc = await db.collection('config').doc('current').get()
  if (!doc.exists) {
    return {
      latestVersion: '0.1.0',
      trialDays: 30,
      jwtExpiryDays: 30,
      serverMessage: null,
      forceUpdateBelowVersion: null,
    }
  }
  const data = doc.data()!
  return {
    latestVersion: data.latestVersion ?? '0.1.0',
    trialDays: data.trialDays ?? 30,
    jwtExpiryDays: data.jwtExpiryDays ?? 30,
    serverMessage: data.serverMessage ?? null,
    forceUpdateBelowVersion: data.forceUpdateBelowVersion ?? null,
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0
    const nb = pb[i] ?? 0
    if (na !== nb) return na - nb
  }
  return 0
}

// --- CORS ヘルパー ---

function setCors(res: ff.Response): void {
  res.set('Access-Control-Allow-Origin', '*')
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
}

// --- 単一エントリポイント（パスベースルーティング） ---

ff.http('api', async (req: ff.Request, res: ff.Response) => {
  setCors(res)
  if (req.method === 'OPTIONS') { res.status(204).send(''); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const path = req.path
  if (path === '/api/register' || path === '/register') {
    await handleRegister(req, res)
    return
  }
  // デフォルト: heartbeat（/, /api/heartbeat, その他すべて）
  await handleHeartbeat(req, res)
})

// --- heartbeat ---

async function handleHeartbeat(req: ff.Request, res: ff.Response): Promise<void> {
  const { deviceId, appVersion } = req.body as { deviceId?: string; appVersion?: string }
  if (!deviceId || !appVersion) {
    res.status(400).json({ error: 'deviceId and appVersion are required' })
    return
  }

  const config = await getConfig()
  const now = Timestamp.now()
  const todayStr = new Date().toISOString().slice(0, 10)

  // デバイスレコード取得/作成
  const deviceRef = db.collection('devices').doc(deviceId)
  const deviceDoc = await deviceRef.get()

  if (!deviceDoc.exists) {
    // 新規デバイス → トライアル開始
    await deviceRef.set({
      trialStartDate: now,
      registeredKey: null,
      appVersion,
      lastHeartbeat: now,
      createdAt: now,
      heartbeatCount: 1,
      heartbeatDate: todayStr,
    })

    res.json({
      registered: false,
      trialValid: true,
      trialDaysRemaining: config.trialDays,
      latestVersion: config.latestVersion,
      updateAvailable: compareVersions(config.latestVersion, appVersion) > 0,
      serverMessage: config.serverMessage,
    })
    return
  }

  const deviceData = deviceDoc.data()!

  // レート制限チェック
  const hbDate = deviceData.heartbeatDate as string | undefined
  let hbCount = (deviceData.heartbeatCount as number) ?? 0
  if (hbDate === todayStr) {
    if (hbCount >= 10) {
      res.status(429).json({ error: 'Rate limit exceeded. Try again tomorrow.' })
      return
    }
    hbCount++
  } else {
    hbCount = 1
  }

  // デバイスレコード更新
  await deviceRef.update({
    appVersion,
    lastHeartbeat: now,
    heartbeatCount: hbCount,
    heartbeatDate: todayStr,
  })

  const registeredKey = deviceData.registeredKey as string | null

  // 登録済み
  if (registeredKey) {
    // download key からヒントを取得（keys コレクションは keyHash なのでヒント取得不可。
    // deviceData に keyHint を保存する方式に変更）
    const keyHint = (deviceData.keyHint as string) ?? '****'
    const nowSec = Math.floor(Date.now() / 1000)
    const expSec = nowSec + config.jwtExpiryDays * 86400
    const jwt = signJwt({
      deviceId,
      keyHint,
      iat: nowSec,
      exp: expSec,
    })

    res.json({
      registered: true,
      trialValid: false,
      trialDaysRemaining: 0,
      jwt,
      latestVersion: config.latestVersion,
      updateAvailable: compareVersions(config.latestVersion, appVersion) > 0,
      serverMessage: config.serverMessage,
    })
    return
  }

  // トライアル判定
  const trialStart = deviceData.trialStartDate as Timestamp
  const trialStartMs = trialStart.toMillis()
  const trialEndMs = trialStartMs + config.trialDays * 86400 * 1000
  const nowMs = Date.now()

  if (nowMs < trialEndMs) {
    const remaining = Math.ceil((trialEndMs - nowMs) / (86400 * 1000))
    res.json({
      registered: false,
      trialValid: true,
      trialDaysRemaining: remaining,
      latestVersion: config.latestVersion,
      updateAvailable: compareVersions(config.latestVersion, appVersion) > 0,
      serverMessage: config.serverMessage,
    })
    return
  }

  // トライアル期限切れ
  res.json({
    registered: false,
    trialValid: false,
    trialDaysRemaining: 0,
    latestVersion: config.latestVersion,
    updateAvailable: compareVersions(config.latestVersion, appVersion) > 0,
    serverMessage: config.serverMessage,
  })
}

// --- register ---

async function handleRegister(req: ff.Request, res: ff.Response): Promise<void> {
  const { deviceId, downloadKey } = req.body as { deviceId?: string; downloadKey?: string }
  if (!deviceId || !downloadKey) {
    res.status(400).json({ error: 'deviceId and downloadKey are required' })
    return
  }

  // download key のハッシュ化
  const keyHash = createHash('sha256').update(downloadKey).digest('hex')
  const keyHint = buildKeyHint(downloadKey)

  // デバイス存在確認
  const deviceRef = db.collection('devices').doc(deviceId)
  const deviceDoc = await deviceRef.get()
  if (!deviceDoc.exists) {
    res.status(400).json({ error: 'Device not found. Please launch the app first.' })
    return
  }

  // 旧キーからデバイスを除外（キー変更時のクリーンアップ）
  const oldKeyHash = deviceDoc.data()?.registeredKey as string | null
  if (oldKeyHash && oldKeyHash !== keyHash) {
    const oldKeyRef = db.collection('keys').doc(oldKeyHash)
    const oldKeyDoc = await oldKeyRef.get()
    if (oldKeyDoc.exists) {
      await oldKeyRef.update({
        devices: FieldValue.arrayRemove(deviceId),
      })
    }
  }

  // keys コレクション確認
  const keyRef = db.collection('keys').doc(keyHash)
  const keyDoc = await keyRef.get()

  if (keyDoc.exists) {
    const keyData = keyDoc.data()!
    const devices = (keyData.devices as string[]) ?? []
    const maxDevices = (keyData.maxDevices as number) ?? 3

    // 既に登録済みのデバイスか確認
    if (devices.includes(deviceId)) {
      // 再登録 → JWT再発行
      const config = await getConfig()
      const nowSec = Math.floor(Date.now() / 1000)
      const jwt = signJwt({
        deviceId,
        keyHint,
        iat: nowSec,
        exp: nowSec + config.jwtExpiryDays * 86400,
      })
      res.json({ success: true, jwt, keyHint })
      return
    }

    // 古いデバイスの自動除外（lastHeartbeat が90日以上前）
    const STALE_THRESHOLD_MS = 90 * 86400 * 1000
    const nowMs = Date.now()
    const staleDeviceIds: string[] = []
    for (const did of devices) {
      const dDoc = await db.collection('devices').doc(did).get()
      if (!dDoc.exists) {
        staleDeviceIds.push(did)
        continue
      }
      const lastHb = dDoc.data()?.lastHeartbeat as Timestamp | undefined
      if (lastHb && (nowMs - lastHb.toMillis()) > STALE_THRESHOLD_MS) {
        staleDeviceIds.push(did)
      }
    }
    if (staleDeviceIds.length > 0) {
      await keyRef.update({
        devices: FieldValue.arrayRemove(...staleDeviceIds),
      })
    }
    const activeDeviceCount = devices.length - staleDeviceIds.length

    // 台数チェック（除外後の台数で判定）
    if (activeDeviceCount >= maxDevices) {
      res.status(403).json({
        success: false,
        error: `Device limit reached (${maxDevices} devices). Please contact support.`,
      })
      return
    }

    // デバイス追加
    await keyRef.update({
      devices: FieldValue.arrayUnion(deviceId),
    })
  } else {
    // 新規キー登録
    // TODO: itch.io API で download key を検証する（初期テスト段階ではスキップ）
    await keyRef.set({
      devices: [deviceId],
      maxDevices: 3,
      validatedAt: Timestamp.now(),
      valid: true,
      createdAt: Timestamp.now(),
    })
  }

  // デバイスレコードを登録済みに更新
  await deviceRef.update({
    registeredKey: keyHash,
    keyHint,
  })

  // JWT発行
  const config = await getConfig()
  const nowSec = Math.floor(Date.now() / 1000)
  const jwt = signJwt({
    deviceId,
    keyHint,
    iat: nowSec,
    exp: nowSec + config.jwtExpiryDays * 86400,
  })

  res.json({ success: true, jwt, keyHint })
}
