import { app, BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdateInfo, ProgressInfo } from 'electron-updater'
import type { UpdateStatus } from './types'

declare const __DEBUG_AUTO_UPDATE__: string

export function initAutoUpdater(win: BrowserWindow): void {
  if (!app.isPackaged && __DEBUG_AUTO_UPDATE__ !== 'true') return

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
