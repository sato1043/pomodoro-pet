import { app, BrowserWindow } from 'electron'
import { createVerify } from 'crypto'
import type { JwtPayload, HeartbeatResponse, LicenseState } from './types'
import { getOrCreateDeviceId, loadSettings, saveSettings } from './settings'

declare const __HEARTBEAT_URL__: string
declare const __DEBUG_LICENSE__: string

// --- RS256 公開鍵（鍵ペア生成後に差し替え） ---
const JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEApMSxnnC7hoL4mEeenajw
3FlIx4tSvQr/+lSX8DIjTZ0FcVQFPU2gDpEdB3ncYfVyaX7m+Q7Vm0aUflmK+lwo
A/2gZdGUBAPY3c83vyItbpweJqcNGahGLX9TKxl2/eQqfnQCTWoQY6h1Ro0ZFTfb
8HotJrLPmXtehwF1s8DHxK+73nop83c4yQAbJ69hcOsGJGP/Nm/hPg0DfdF56jP8
rMckPLwCYVhCp3PBOoptp/AEl5f8DOfCiaYhvWTThZwI/Nb4RZBJpswpAkeXcdla
gSLJvlP2DwfVNWeTjD//GfA5erNdrGagyAx0v/cbHOpw5qXsjh+ffkWFODSDymKR
bwIDAQAB
-----END PUBLIC KEY-----`

// --- JWT検証 ---

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
    return payload as JwtPayload
  } catch {
    return null
  }
}

export function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // RS256署名検証
    const signatureInput = `${parts[0]}.${parts[1]}`
    const signature = Buffer.from(parts[2], 'base64url')
    const verify = createVerify('RSA-SHA256')
    verify.update(signatureInput)
    if (!verify.verify(JWT_PUBLIC_KEY, signature)) return null

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
    return payload as JwtPayload
  } catch {
    return null
  }
}

// --- 2段階オンラインチェック ---

async function checkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const response = await fetch('https://github.com', {
      method: 'HEAD',
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return response.ok || response.status < 500
  } catch {
    return false
  }
}

async function heartbeat(deviceId: string, appVersion: string, downloadKey?: string): Promise<HeartbeatResponse | null> {
  if (!__HEARTBEAT_URL__) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const body: Record<string, string> = { deviceId, appVersion }
    if (downloadKey) body.downloadKey = downloadKey
    const response = await fetch(`${__HEARTBEAT_URL__}/api/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!response.ok) return null
    return await response.json() as HeartbeatResponse
  } catch {
    return null
  }
}

// --- ライセンス状態管理 ---

const VALID_LICENSE_MODES = new Set(['registered', 'trial', 'expired', 'restricted'])

function parseDebugLicense(value: string): LicenseState['mode'] | null {
  const v = value.trim().toLowerCase()
  if (VALID_LICENSE_MODES.has(v)) return v as LicenseState['mode']
  return null
}

// 初期状態は trial。ハートビート完了後に実際の状態に遷移する。
// restricted はハートビートで明示的に判定された場合のみ適用する。
// これにより起動〜ハートビート完了までの間にLicenseToastがUIを遮らない。
// __DEBUG_LICENSE__ が有効値なら固定値を使用する。
const debugLicenseMode = parseDebugLicense(__DEBUG_LICENSE__ ?? '')

let currentLicenseState: LicenseState = debugLicenseMode
  ? { mode: debugLicenseMode }
  : { mode: 'trial' }

export function getLicenseState(): LicenseState {
  return currentLicenseState
}

export function setLicenseState(state: LicenseState): void {
  currentLicenseState = state
}

export function getDebugLicenseMode(): LicenseState['mode'] | null {
  return debugLicenseMode
}

// --- ライセンス状態解決 ---

export async function resolveLicense(mainWindow: BrowserWindow | null): Promise<LicenseState> {
  const deviceId = getOrCreateDeviceId()
  const settings = loadSettings()
  const jwt = typeof settings?.jwt === 'string' ? settings.jwt : null
  const downloadKey = typeof settings?.downloadKey === 'string' ? settings.downloadKey : null

  // ローカルJWT確認
  if (jwt) {
    const payload = verifyJwt(jwt)
    if (payload && payload.deviceId === deviceId) {
      const now = Math.floor(Date.now() / 1000)
      const isFresh = (now - payload.iat) < 86400 // 24時間以内
      const isExpired = now > payload.exp

      if (isFresh && !isExpired) {
        // ハートビート不要
        const state: LicenseState = {
          mode: 'registered',
          keyHint: payload.keyHint,
        }
        currentLicenseState = state
        return state
      }
    }
  }

  // Stage 1: 接続確認
  const online = await checkConnectivity()
  if (!online) {
    // オフライン判定
    if (jwt) {
      const payload = verifyJwt(jwt)
      if (payload && payload.deviceId === deviceId) {
        const state: LicenseState = {
          mode: 'registered',
          keyHint: payload.keyHint,
          serverMessage: 'Could not verify registration status. Please connect to the internet.',
        }
        currentLicenseState = state
        return state
      }
    }
    const state: LicenseState = { mode: 'restricted' }
    currentLicenseState = state
    return state
  }

  // Stage 2: ハートビート
  const appVersion = app.getVersion()
  const hbResponse = await heartbeat(deviceId, appVersion, downloadKey ?? undefined)

  if (!hbResponse) {
    // ハートビート失敗 → オフラインと同じ扱い
    if (jwt) {
      const payload = verifyJwt(jwt)
      if (payload && payload.deviceId === deviceId) {
        const state: LicenseState = {
          mode: 'registered',
          keyHint: payload.keyHint,
          serverMessage: 'Could not verify registration status. Please connect to the internet.',
        }
        currentLicenseState = state
        return state
      }
    }
    const state: LicenseState = { mode: 'restricted' }
    currentLicenseState = state
    return state
  }

  // ハートビート成功 → 状態判定
  let state: LicenseState

  if (hbResponse.registered) {
    // JWT保存
    if (hbResponse.jwt && settings) {
      saveSettings({ ...settings, jwt: hbResponse.jwt })
    }
    const payload = hbResponse.jwt ? decodeJwtPayload(hbResponse.jwt) : null
    state = {
      mode: 'registered',
      keyHint: payload?.keyHint,
      serverMessage: hbResponse.serverMessage,
      latestVersion: hbResponse.latestVersion,
      updateAvailable: hbResponse.updateAvailable,
    }
  } else if (hbResponse.trialValid) {
    state = {
      mode: 'trial',
      trialDaysRemaining: hbResponse.trialDaysRemaining,
      serverMessage: hbResponse.serverMessage,
      latestVersion: hbResponse.latestVersion,
      updateAvailable: hbResponse.updateAvailable,
    }
  } else {
    state = {
      mode: 'expired',
      serverMessage: hbResponse.serverMessage,
    }
  }

  currentLicenseState = state

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('license:changed', state)
  }

  return state
}
