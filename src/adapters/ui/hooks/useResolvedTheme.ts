import { useState, useEffect } from 'react'
import type { ThemePreference } from '../../../application/settings/SettingsEvents'

export type ResolvedTheme = 'dark' | 'light'

/**
 * ThemePreferenceを実際のダーク/ライトテーマに解決する。
 *
 * - 'system': OSのprefers-color-schemeに追従
 * - 'auto': isDaytime（太陽高度ベース）に基づいて自動切替
 * - 'light' / 'dark': 固定値
 */
export function useResolvedTheme(pref: ThemePreference, isDaytime?: boolean): ResolvedTheme {
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
  if (pref === 'auto') return isDaytime !== false ? 'light' : 'dark'
  return pref
}
