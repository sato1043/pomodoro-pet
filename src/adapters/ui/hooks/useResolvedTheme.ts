import { useState, useEffect } from 'react'
import type { ThemePreference } from '../../../application/settings/SettingsEvents'

export type ResolvedTheme = 'dark' | 'light'

export function useResolvedTheme(pref: ThemePreference): ResolvedTheme {
  const [osTheme, setOsTheme] = useState<ResolvedTheme>(() => {
    if (typeof window === 'undefined') return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  useEffect(() => {
    if (pref !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent): void => {
      setOsTheme(e.matches ? 'dark' : 'light')
    }
    setOsTheme(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [pref])

  if (pref === 'system') return osTheme
  return pref
}
