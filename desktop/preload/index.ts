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
    ipcRenderer.invoke('about:load')
})
