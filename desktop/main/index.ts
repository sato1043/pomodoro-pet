import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { readFile } from 'fs/promises'
import { createVerify, randomUUID } from 'crypto'
import { autoUpdater } from 'electron-updater'
import type { UpdateInfo, ProgressInfo } from 'electron-updater'

// WSL2等でGPUプロセス初期化失敗時にソフトウェアWebGL(SwiftShader)へフォールバック
app.commandLine.appendSwitch('enable-unsafe-swiftshader')

// Windowsトースト通知に必須。ビルド時にpackage.jsonのbuild.appIdから埋め込まれる
declare const __APP_ID__: string
declare const __HEARTBEAT_URL__: string
declare const __STORE_URL__: string
declare const __DEBUG_LICENSE__: string

if (__APP_ID__) {
  app.setAppUserModelId(__APP_ID__)
}

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

// --- 型定義 ---

interface JwtPayload {
  deviceId: string
  keyHint: string
  iat: number
  exp: number
}

interface HeartbeatResponse {
  registered: boolean
  trialValid: boolean
  trialDaysRemaining: number
  jwt?: string
  latestVersion: string
  updateAvailable: boolean
  serverMessage?: string
  forceUpdate?: boolean
}

interface LicenseState {
  mode: 'registered' | 'trial' | 'expired' | 'restricted'
  trialDaysRemaining?: number
  keyHint?: string
  serverMessage?: string
  latestVersion?: string
  updateAvailable?: boolean
}

interface UpdateStatus {
  state: 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error'
  version?: string
  percent?: number
  message?: string
}

// --- 設定ファイル読み書き ---

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

function getStatisticsPath(): string {
  return join(app.getPath('userData'), 'statistics.json')
}

function loadSettings(): Record<string, unknown> | null {
  try {
    const data = readFileSync(getSettingsPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

function saveSettings(settings: Record<string, unknown>): void {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf-8')
}

function loadStatistics(): Record<string, unknown> | null {
  try {
    const data = readFileSync(getStatisticsPath(), 'utf-8')
    return JSON.parse(data)
  } catch {
    return null
  }
}

function saveStatistics(data: Record<string, unknown>): void {
  const dir = app.getPath('userData')
  mkdirSync(dir, { recursive: true })
  writeFileSync(getStatisticsPath(), JSON.stringify(data, null, 2), 'utf-8')
}

// --- deviceId管理 ---

function getOrCreateDeviceId(): string {
  const settings = loadSettings()
  if (settings && typeof settings.deviceId === 'string') {
    return settings.deviceId
  }
  const deviceId = randomUUID()
  const updated = settings ? { ...settings, deviceId } : { deviceId }
  saveSettings(updated)
  return deviceId
}

// --- JWT検証 ---

function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'))
    return payload as JwtPayload
  } catch {
    return null
  }
}

function verifyJwt(token: string): JwtPayload | null {
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

// --- ライセンス状態解決 ---

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


async function resolveLicense(mainWindow: BrowserWindow | null): Promise<LicenseState> {
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

// --- autoUpdater ---

function initAutoUpdater(win: BrowserWindow): void {
  if (!app.isPackaged) return

  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true

  function sendUpdateStatus(status: UpdateStatus): void {
    if (win && !win.isDestroyed()) {
      win.webContents.send('update:status', status)
    }
  }

  autoUpdater.on('checking-for-update', () => {
    sendUpdateStatus({ state: 'checking' })
  })

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    sendUpdateStatus({ state: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    sendUpdateStatus({ state: 'not-available' })
  })

  autoUpdater.on('download-progress', (progress: ProgressInfo) => {
    sendUpdateStatus({ state: 'downloading', percent: progress.percent })
  })

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    sendUpdateStatus({ state: 'downloaded', version: info.version })
  })

  autoUpdater.on('error', (err: Error) => {
    sendUpdateStatus({ state: 'error', message: err.message })
  })
}

// --- IPC ハンドラ ---

ipcMain.handle('settings:load', () => {
  return loadSettings()
})

ipcMain.handle('settings:save', (_event, settings: Record<string, unknown>) => {
  saveSettings(settings)
})

ipcMain.handle('statistics:load', () => {
  return loadStatistics()
})

ipcMain.handle('statistics:save', (_event, data: Record<string, unknown>) => {
  saveStatistics(data)
})

ipcMain.handle('notification:show', (_event, options: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    new Notification({ title: options.title, body: options.body }).show()
  }
})

ipcMain.handle('about:load', async () => {
  const isDev = !app.isPackaged
  const licensesDir = isDev
    ? join(__dirname, '../../licenses')
    : join(process.resourcesPath, 'licenses')

  async function readLicenseFile(filename: string): Promise<string> {
    try {
      return await readFile(join(licensesDir, filename), 'utf-8')
    } catch {
      return ''
    }
  }

  const licenseDir = isDev
    ? join(__dirname, '../..')
    : process.resourcesPath

  async function readRootFile(filename: string): Promise<string> {
    try {
      return await readFile(join(licenseDir, filename), 'utf-8')
    } catch {
      return ''
    }
  }

  const [licensesText, eulaText, privacyPolicyText, licenseText] = await Promise.all([
    readLicenseFile('THIRD_PARTY_LICENSES.txt'),
    readLicenseFile('EULA.txt'),
    readLicenseFile('PRIVACY_POLICY.txt'),
    readRootFile('LICENSE'),
  ])

  return { version: app.getVersion(), licensesText, eulaText, privacyPolicyText, licenseText }
})

ipcMain.handle('registration-guide:load', async () => {
  const isDev = !app.isPackaged
  const licensesDir = isDev
    ? join(__dirname, '../../licenses')
    : join(process.resourcesPath, 'licenses')
  try {
    return await readFile(join(licensesDir, 'REGISTRATION_GUIDE.txt'), 'utf-8')
  } catch {
    return ''
  }
})

// ライセンス関連IPC
ipcMain.handle('license:status', () => {
  return currentLicenseState
})

ipcMain.handle('license:register', async (_event, key: string) => {
  if (!__HEARTBEAT_URL__) {
    return { success: false, error: 'Server not configured' }
  }
  const deviceId = getOrCreateDeviceId()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)
    const response = await fetch(`${__HEARTBEAT_URL__}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, downloadKey: key }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { error?: string }
      return { success: false, error: body.error ?? `Server error (${response.status})` }
    }
    const result = await response.json() as { success: boolean; jwt: string; keyHint: string; error?: string }
    if (result.success) {
      // JWT と downloadKey を保存
      const settings = loadSettings() ?? {}
      saveSettings({ ...settings, jwt: result.jwt, downloadKey: key })
      // ライセンス状態を更新
      currentLicenseState = {
        mode: 'registered',
        keyHint: result.keyHint,
      }
      // レンダラーに通知
      const windows = BrowserWindow.getAllWindows()
      for (const win of windows) {
        if (!win.isDestroyed()) {
          win.webContents.send('license:changed', currentLicenseState)
        }
      }
    }
    return { success: result.success, error: result.error }
  } catch {
    return { success: false, error: 'Network error. Please check your internet connection.' }
  }
})

ipcMain.handle('license:check', async () => {
  const windows = BrowserWindow.getAllWindows()
  const mainWindow = windows.length > 0 ? windows[0] : null
  return resolveLicense(mainWindow)
})

// アップデート関連IPC
ipcMain.handle('update:check', async () => {
  if (!app.isPackaged) return
  if (currentLicenseState.mode === 'expired' || currentLicenseState.mode === 'restricted') return
  await autoUpdater.checkForUpdates()
})

ipcMain.handle('update:download', async () => {
  if (!app.isPackaged) return
  if (currentLicenseState.mode === 'expired' || currentLicenseState.mode === 'restricted') return
  await autoUpdater.downloadUpdate()
})

ipcMain.handle('update:install', () => {
  autoUpdater.quitAndInstall()
})

// ブラウザリンク
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  // セキュリティ: http/httpsスキームのみ許可
  if (url.startsWith('https://') || url.startsWith('http://')) {
    await shell.openExternal(url)
  }
})

// --- ウィンドウ作成 ---

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 390,
    height: 844,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  if (process.env.VITE_DEV_TOOLS === '1') {
    mainWindow.webContents.openDevTools()
  }

  // autoUpdater初期化
  initAutoUpdater(mainWindow)

  // 起動後10秒でライセンスチェック + アップデートチェック
  // HEARTBEAT_URL未設定 → 初期状態（trial）を維持
  // __DEBUG_LICENSE__設定時 → 固定値をpushしてresolveLicenseをスキップ
  setTimeout(async () => {
    if (debugLicenseMode) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('license:changed', currentLicenseState)
      }
      return
    }
    if (!__HEARTBEAT_URL__) return

    const state = await resolveLicense(mainWindow)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('license:changed', state)
    }
    // アップデートチェック（registered/trial のみ）
    if (state.mode === 'registered' || state.mode === 'trial') {
      autoUpdater.checkForUpdates().catch(() => {})
    }
  }, 10000)
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
