import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { isFeatureEnabled } from '../../application/license/LicenseState'
import type { FeatureName } from '../../application/license/LicenseState'

interface LicenseContextValue {
  licenseMode: LicenseMode | null
  serverMessage: string | undefined
  canUse: (feature: FeatureName) => boolean
}

const LicenseCtx = createContext<LicenseContextValue | null>(null)

export function LicenseProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const [licenseMode, setLicenseMode] = useState<LicenseMode | null>(null)
  const [serverMessage, setServerMessage] = useState<string | undefined>(undefined)

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
    return isFeatureEnabled(licenseMode ?? 'trial', feature)
  }, [licenseMode])

  return (
    <LicenseCtx.Provider value={{ licenseMode, serverMessage, canUse }}>
      {children}
    </LicenseCtx.Provider>
  )
}

export function useLicenseMode(): LicenseContextValue {
  const ctx = useContext(LicenseCtx)
  if (!ctx) throw new Error('useLicenseMode must be used within LicenseProvider')
  return ctx
}
