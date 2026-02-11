import { app, BrowserWindow } from 'electron'
import { join } from 'path'

// WSL2等でGPUプロセス初期化失敗時にソフトウェアWebGL(SwiftShader)へフォールバック
app.commandLine.appendSwitch('enable-unsafe-swiftshader')

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
