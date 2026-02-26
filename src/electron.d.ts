// --- ライセンス関連型 ---

type LicenseMode = 'registered' | 'trial' | 'expired' | 'restricted'

interface LicenseState {
  mode: LicenseMode
  trialDaysRemaining?: number
  keyHint?: string
  serverMessage?: string
  latestVersion?: string
  updateAvailable?: boolean
}

type UpdateState = 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error'

interface UpdateStatus {
  state: UpdateState
  version?: string
  percent?: number
  message?: string
}

// --- Electron API ---

interface ElectronAPI {
  platform: string
  loadSettings(): Promise<Record<string, unknown> | null>
  saveSettings(settings: Record<string, unknown>): Promise<void>
  showNotification(title: string, body: string): Promise<void>
  loadStatistics(): Promise<Record<string, unknown> | null>
  saveStatistics(data: Record<string, unknown>): Promise<void>
  loadAbout(): Promise<{ version: string; licensesText: string; eulaText: string; privacyPolicyText: string; licenseText: string }>
  loadRegistrationGuide(): Promise<string>

  // ライセンス関連
  checkLicenseStatus(): Promise<LicenseState>
  registerLicense(key: string): Promise<{ success: boolean; error?: string }>
  checkLicense(): Promise<LicenseState>

  // アップデート関連
  checkForUpdate(): Promise<void>
  downloadUpdate(): Promise<void>
  installUpdate(): Promise<void>

  // ブラウザリンク
  openExternal(url: string): Promise<void>

  // Push通知受信
  onUpdateStatus(cb: (status: UpdateStatus) => void): () => void
  onLicenseChanged(cb: (state: LicenseState) => void): () => void
}

interface Window {
  electronAPI: ElectronAPI
}
