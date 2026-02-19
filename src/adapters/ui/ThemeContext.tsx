import { createContext, useContext, useState, useEffect } from 'react'
import type { ThemePreference } from '../../application/settings/SettingsEvents'
import type { SettingsEvent } from '../../application/settings/SettingsEvents'
import { useAppDeps } from './AppContext'
import { useEventBusCallback } from './hooks/useEventBus'
import { useResolvedTheme } from './hooks/useResolvedTheme'
import { darkThemeClass, lightThemeClass } from './styles/theme.css'

interface ThemeContextValue {
  themePreference: ThemePreference
  setThemePreference: (theme: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const { settingsService, bus } = useAppDeps()
  const [themePreference, setThemePreference] = useState<ThemePreference>(
    () => settingsService.themePreference
  )
  const resolvedTheme = useResolvedTheme(themePreference)

  useEventBusCallback<SettingsEvent>(bus, 'ThemeLoaded', (event) => {
    if (event.type === 'ThemeLoaded') {
      setThemePreference(event.theme)
    }
  })

  useEffect(() => {
    const el = document.documentElement
    const themeClass = resolvedTheme === 'dark' ? darkThemeClass : lightThemeClass
    const otherClass = resolvedTheme === 'dark' ? lightThemeClass : darkThemeClass
    el.classList.remove(otherClass)
    el.classList.add(themeClass)
    return () => { el.classList.remove(themeClass) }
  }, [resolvedTheme])

  return (
    <ThemeContext.Provider value={{ themePreference, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
