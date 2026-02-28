export interface JwtPayload {
  deviceId: string
  keyHint: string
  iat: number
  exp: number
}

export interface HeartbeatResponse {
  registered: boolean
  trialValid: boolean
  trialDaysRemaining: number
  jwt?: string
  latestVersion: string
  updateAvailable: boolean
  serverMessage?: string
  forceUpdate?: boolean
}

export interface LicenseState {
  mode: 'registered' | 'trial' | 'expired' | 'restricted'
  trialDaysRemaining?: number
  keyHint?: string
  serverMessage?: string
  latestVersion?: string
  updateAvailable?: boolean
}

export interface UpdateStatus {
  state: 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error'
  version?: string
  percent?: number
  message?: string
}
