interface ElectronAPI {
  platform: string
  loadSettings(): Promise<Record<string, unknown> | null>
  saveSettings(settings: Record<string, unknown>): Promise<void>
  showNotification(title: string, body: string): Promise<void>
}

interface Window {
  electronAPI: ElectronAPI
}
