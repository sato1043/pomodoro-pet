interface ElectronAPI {
  platform: string
  loadSettings(): Promise<Record<string, unknown> | null>
  saveSettings(settings: Record<string, unknown>): Promise<void>
  showNotification(title: string, body: string): Promise<void>
  loadStatistics(): Promise<Record<string, unknown> | null>
  saveStatistics(data: Record<string, unknown>): Promise<void>
}

interface Window {
  electronAPI: ElectronAPI
}
