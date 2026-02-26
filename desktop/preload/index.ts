import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  loadSettings: (): Promise<Record<string, unknown> | null> =>
    ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('settings:save', settings),
  showNotification: (title: string, body: string): Promise<void> =>
    ipcRenderer.invoke('notification:show', { title, body }),
  loadStatistics: (): Promise<Record<string, unknown> | null> =>
    ipcRenderer.invoke('statistics:load'),
  saveStatistics: (data: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('statistics:save', data),
  loadAbout: (): Promise<{ version: string; licensesText: string }> =>
    ipcRenderer.invoke('about:load'),
  loadRegistrationGuide: (): Promise<string> =>
    ipcRenderer.invoke('registration-guide:load'),

  // ライセンス関連
  checkLicenseStatus: (): Promise<unknown> =>
    ipcRenderer.invoke('license:status'),
  registerLicense: (key: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('license:register', key),
  checkLicense: (): Promise<unknown> =>
    ipcRenderer.invoke('license:check'),

  // アップデート関連
  checkForUpdate: (): Promise<void> =>
    ipcRenderer.invoke('update:check'),
  downloadUpdate: (): Promise<void> =>
    ipcRenderer.invoke('update:download'),
  installUpdate: (): Promise<void> =>
    ipcRenderer.invoke('update:install'),

  // ブラウザリンク
  openExternal: (url: string): Promise<void> =>
    ipcRenderer.invoke('shell:openExternal', url),

  // Push通知受信（main → renderer）
  onUpdateStatus: (cb: (status: unknown) => void): (() => void) => {
    const handler = (_e: unknown, status: unknown): void => cb(status)
    ipcRenderer.on('update:status', handler)
    return () => ipcRenderer.removeListener('update:status', handler)
  },
  onLicenseChanged: (cb: (state: unknown) => void): (() => void) => {
    const handler = (_e: unknown, state: unknown): void => cb(state)
    ipcRenderer.on('license:changed', handler)
    return () => ipcRenderer.removeListener('license:changed', handler)
  },
})
