import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'

// WSL2等でGPUプロセス初期化失敗時にソフトウェアWebGL(SwiftShader)へフォールバック
app.commandLine.appendSwitch('enable-unsafe-swiftshader')

function getSettingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
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

ipcMain.handle('settings:load', () => {
  return loadSettings()
})

ipcMain.handle('settings:save', (_event, settings: Record<string, unknown>) => {
  saveSettings(settings)
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
