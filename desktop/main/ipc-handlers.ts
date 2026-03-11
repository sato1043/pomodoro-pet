import { app, BrowserWindow, ipcMain, Notification, powerSaveBlocker, shell } from 'electron'
import { join } from 'path'
import { readFile } from 'fs/promises'
import { autoUpdater } from 'electron-updater'
import { loadSettings, saveSettings, loadStatistics, saveStatistics, loadEmotionHistory, saveEmotionHistory, getOrCreateDeviceId } from './settings'
import { getLicenseState, setLicenseState, resolveLicense } from './license'
import { handleExportData, handleImportData } from './export-import'

declare const __HEARTBEAT_URL__: string

let sleepBlockerId: number | null = null

export function registerIpcHandlers(): void {
  // --- スリープ抑制 ---

  ipcMain.handle('sleepBlocker:start', () => {
    if (sleepBlockerId !== null && powerSaveBlocker.isStarted(sleepBlockerId)) return
    sleepBlockerId = powerSaveBlocker.start('prevent-app-suspension')
  })

  ipcMain.handle('sleepBlocker:stop', () => {
    if (sleepBlockerId === null) return
    if (powerSaveBlocker.isStarted(sleepBlockerId)) {
      powerSaveBlocker.stop(sleepBlockerId)
    }
    sleepBlockerId = null
  })

  // --- 設定 ---

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

  ipcMain.handle('emotionHistory:load', () => {
    return loadEmotionHistory()
  })

  ipcMain.handle('emotionHistory:save', (_event, data: Record<string, unknown>) => {
    saveEmotionHistory(data)
  })

  // --- 通知 ---

  ipcMain.handle('notification:show', (_event, options: { title: string; body: string }) => {
    if (Notification.isSupported()) {
      new Notification({ title: options.title, body: options.body }).show()
    }
  })

  // --- About / Registration Guide ---

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

  // --- ライセンス ---

  ipcMain.handle('license:status', () => {
    return getLicenseState()
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
        const newState = {
          mode: 'registered' as const,
          keyHint: result.keyHint,
        }
        setLicenseState(newState)
        // レンダラーに通知
        const windows = BrowserWindow.getAllWindows()
        for (const win of windows) {
          if (!win.isDestroyed()) {
            win.webContents.send('license:changed', newState)
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

  // --- アップデート ---

  ipcMain.handle('update:check', async () => {
    if (!app.isPackaged) return
    const state = getLicenseState()
    if (state.mode === 'expired' || state.mode === 'restricted') return
    await autoUpdater.checkForUpdates()
  })

  ipcMain.handle('update:download', async () => {
    if (!app.isPackaged) return
    const state = getLicenseState()
    if (state.mode === 'expired' || state.mode === 'restricted') return
    await autoUpdater.downloadUpdate()
  })

  ipcMain.handle('update:install', () => {
    autoUpdater.quitAndInstall()
  })

  // --- ウィンドウ操作 ---

  ipcMain.handle('window:minimize', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.minimize()
  })

  ipcMain.handle('window:close', (event) => {
    BrowserWindow.fromWebContents(event.sender)?.close()
  })

  // --- データエクスポート/インポート ---

  ipcMain.handle('data:export', async () => {
    return handleExportData()
  })

  ipcMain.handle('data:import', async () => {
    const result = await handleImportData()
    if (result.success) {
      // インポート成功: アプリを再起動
      app.relaunch()
      app.exit(0)
    }
    return result
  })

  // --- ブラウザリンク ---

  ipcMain.handle('shell:openExternal', async (_event, url: string) => {
    // セキュリティ: http/httpsスキームのみ許可
    if (url.startsWith('https://') || url.startsWith('http://')) {
      await shell.openExternal(url)
    }
  })
}
