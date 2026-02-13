import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  loadSettings: (): Promise<Record<string, unknown> | null> =>
    ipcRenderer.invoke('settings:load'),
  saveSettings: (settings: Record<string, unknown>): Promise<void> =>
    ipcRenderer.invoke('settings:save', settings)
})
