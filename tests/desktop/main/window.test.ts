import { vi, describe, it, expect, beforeEach } from 'vitest'

// --- ipcMain.handle 呼び出しをキャプチャするモック ---

const handleMap = new Map<string, (...args: unknown[]) => unknown>()

vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0',
    getPath: () => '/tmp/test-pomodoro-pet',
    isPackaged: false,
  },
  ipcMain: {
    handle: (channel: string, handler: (...args: unknown[]) => unknown) => {
      handleMap.set(channel, handler)
    },
  },
  BrowserWindow: {
    fromWebContents: vi.fn(),
    getAllWindows: () => [],
  },
  Notification: {
    isSupported: () => false,
  },
  shell: {
    openExternal: vi.fn(),
  },
}))

vi.mock('electron-updater', () => ({
  autoUpdater: {
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
  },
}))

vi.mock('fs/promises', () => ({
  readFile: vi.fn().mockResolvedValue(''),
}))

vi.mock('../../../desktop/main/settings', () => ({
  loadSettings: vi.fn().mockReturnValue(null),
  saveSettings: vi.fn(),
  loadStatistics: vi.fn().mockReturnValue(null),
  saveStatistics: vi.fn(),
  getOrCreateDeviceId: vi.fn().mockReturnValue('test-device'),
}))

vi.mock('../../../desktop/main/license', () => ({
  getLicenseState: vi.fn().mockReturnValue({ mode: 'trial' }),
  setLicenseState: vi.fn(),
  resolveLicense: vi.fn().mockResolvedValue({ mode: 'trial' }),
}))

import { BrowserWindow } from 'electron'
import { registerIpcHandlers } from '../../../desktop/main/ipc-handlers'

// --- テスト ---

describe('window IPC handlers', () => {
  beforeEach(() => {
    handleMap.clear()
    vi.clearAllMocks()
    registerIpcHandlers()
  })

  describe('window:minimize', () => {
    it('ハンドラが登録される', () => {
      expect(handleMap.has('window:minimize')).toBe(true)
    })

    it('BrowserWindow.minimize() を呼ぶ', () => {
      const mockMinimize = vi.fn()
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({
        minimize: mockMinimize,
      } as unknown as Electron.BrowserWindow)

      const handler = handleMap.get('window:minimize')!
      const mockEvent = { sender: {} as Electron.WebContents }
      handler(mockEvent)

      expect(BrowserWindow.fromWebContents).toHaveBeenCalledWith(mockEvent.sender)
      expect(mockMinimize).toHaveBeenCalled()
    })

    it('fromWebContents が null を返す場合エラーにならない', () => {
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null as unknown as Electron.BrowserWindow)

      const handler = handleMap.get('window:minimize')!
      const mockEvent = { sender: {} as Electron.WebContents }

      expect(() => handler(mockEvent)).not.toThrow()
    })
  })

  describe('window:close', () => {
    it('ハンドラが登録される', () => {
      expect(handleMap.has('window:close')).toBe(true)
    })

    it('BrowserWindow.close() を呼ぶ', () => {
      const mockClose = vi.fn()
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue({
        close: mockClose,
      } as unknown as Electron.BrowserWindow)

      const handler = handleMap.get('window:close')!
      const mockEvent = { sender: {} as Electron.WebContents }
      handler(mockEvent)

      expect(BrowserWindow.fromWebContents).toHaveBeenCalledWith(mockEvent.sender)
      expect(mockClose).toHaveBeenCalled()
    })

    it('fromWebContents が null を返す場合エラーにならない', () => {
      vi.mocked(BrowserWindow.fromWebContents).mockReturnValue(null as unknown as Electron.BrowserWindow)

      const handler = handleMap.get('window:close')!
      const mockEvent = { sender: {} as Electron.WebContents }

      expect(() => handler(mockEvent)).not.toThrow()
    })
  })
})
