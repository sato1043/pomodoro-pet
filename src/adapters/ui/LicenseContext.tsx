import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { isFeatureEnabled, resolveReleaseChannel, getFeatureChannel } from '../../application/license/LicenseState'
import type { FeatureName, ReleaseChannel } from '../../application/license/LicenseState'

interface LicenseContextValue {
  licenseMode: LicenseMode | null
  serverMessage: string | undefined
  releaseChannel: ReleaseChannel
  canUse: (feature: FeatureName) => boolean
}

const LicenseCtx = createContext<LicenseContextValue | null>(null)

export function LicenseProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [licenseMode, setLicenseMode] = useState<LicenseMode | null>(null)
  const [serverMessage, setServerMessage] = useState<string | undefined>(undefined)

  const releaseChannel = useMemo<ReleaseChannel>(
    () => resolveReleaseChannel(import.meta.env.VITE_RELEASE_CHANNEL),
    []
  )

  useEffect(() => {
    if (!window.electronAPI?.onLicenseChanged) return
    const unsubscribe = window.electronAPI.onLicenseChanged((state) => {
      const s = state as LicenseState
      setLicenseMode(s.mode)
      setServerMessage(s.serverMessage)
    })
    // 初期ロード
    if (window.electronAPI.checkLicenseStatus) {
      window.electronAPI.checkLicenseStatus().then((s) => {
        const state = s as LicenseState
        setLicenseMode(state.mode)
        setServerMessage(state.serverMessage)
      })
    }
    return unsubscribe
  }, [])

  const canUse = useCallback((feature: FeatureName): boolean => {
    return isFeatureEnabled(licenseMode ?? 'trial', feature, releaseChannel)
  }, [licenseMode, releaseChannel])

  return (
    <LicenseCtx.Provider value={{ licenseMode, serverMessage, releaseChannel, canUse }}>
      {children}
    </LicenseCtx.Provider>
  )
}

export function useLicenseMode(): LicenseContextValue {
  const ctx = useContext(LicenseCtx)
  if (!ctx) throw new Error('useLicenseMode must be used within LicenseProvider')
  return ctx
}

export { getFeatureChannel }
