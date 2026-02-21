import { app, BrowserWindow, ipcMain, Notification } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

// WSL2等でGPUプロセス初期化失敗時にソフトウェアWebGL(SwiftShader)へフォールバック
app.commandLine.appendSwitch('enable-unsafe-swiftshader')

// Windowsトースト通知に必須。ビルド時にpackage.jsonのbuild.appIdから埋め込まれる
declare const __APP_ID__: string
if (__APP_ID__) {
  app.setAppUserModelId(__APP_ID__)
}

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
