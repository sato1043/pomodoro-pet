import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'
import { registerIpcHandlers } from './ipc-handlers'
import { initAutoUpdater } from './updater'
import { getLicenseState, getDebugLicenseMode, resolveLicense } from './license'

// WSL2等でGPUプロセス初期化失敗時にソフトウェアWebGL(SwiftShader)へフォールバック
app.commandLine.appendSwitch('enable-unsafe-swiftshader')

// Windowsトースト通知に必須。ビルド時にpackage.jsonのbuild.appIdから埋め込まれる
declare const __APP_ID__: string
declare const __HEARTBEAT_URL__: string

if (__APP_ID__) {
  app.setAppUserModelId(__APP_ID__)
}

// IPCハンドラ登録（app.whenReady前に実行。元のコードと同じタイミング）
registerIpcHandlers()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 390,
    height: 844,
    frame: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    minWidth: 390,
    maxWidth: 390,
    minHeight: 844,
    maxHeight: 844,
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
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  // autoUpdater初期化
  initAutoUpdater(mainWindow)

  // 起動後10秒でライセンスチェック + アップデートチェック
  // HEARTBEAT_URL未設定 → 初期状態（trial）を維持
  // __DEBUG_LICENSE__設定時 → 固定値をpushしてresolveLicenseをスキップ
  setTimeout(async () => {
    const debugLicenseMode = getDebugLicenseMode()
    if (debugLicenseMode) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('license:changed', getLicenseState())
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
