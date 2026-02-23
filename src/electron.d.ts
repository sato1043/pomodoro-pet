interface ElectronAPI {
  platform: string
  loadSettings(): Promise<Record<string, unknown> | null>
  saveSettings(settings: Record<string, unknown>): Promise<void>
  showNotification(title: string, body: string): Promise<void>
  loadStatistics(): Promise<Record<string, unknown> | null>
  saveStatistics(data: Record<string, unknown>): Promise<void>
  loadAbout(): Promise<{ version: string; licensesText: string; eulaText: string; privacyPolicyText: string; licenseText: string }>
}

interface Window {
  electronAPI: ElectronAPI
}
