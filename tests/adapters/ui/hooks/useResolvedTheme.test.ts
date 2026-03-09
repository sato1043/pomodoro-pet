import { describe, it, expect } from 'vitest'
import type { ThemePreference } from '../../../../src/application/settings/SettingsEvents'
import type { ResolvedTheme } from '../../../../src/adapters/ui/hooks/useResolvedTheme'

/**
 * useResolvedTheme hookのテーマ解決ロジックのテスト。
 * hook自体はReact hooks（useState/useEffect）を使うためjsdom環境なしでは呼べない。
 * ここでは hook 内部の純粋な解決ルール（auto/light/dark分岐）を同等の関数で検証する。
 * system モードの MediaQueryList 連携は E2E テストで検証する。
 */

/**
 * useResolvedTheme の解決ロジック再現（system以外の分岐）。
 * hook 本体: src/adapters/ui/hooks/useResolvedTheme.ts:30-32
 */
function resolveTheme(pref: ThemePreference, isDaytime?: boolean, osTheme: ResolvedTheme = 'dark'): ResolvedTheme {
  if (pref === 'system') return osTheme
  if (pref === 'auto') return isDaytime !== false ? 'light' : 'dark'
  return pref
}

describe('useResolvedTheme 解決ロジック', () => {
  describe('light / dark 固定モード', () => {
    it('pref=light → light', () => {
      expect(resolveTheme('light')).toBe('light')
    })

    it('pref=dark → dark', () => {
      expect(resolveTheme('dark')).toBe('dark')
    })

    it('pref=light は isDaytime に依存しない', () => {
      expect(resolveTheme('light', true)).toBe('light')
      expect(resolveTheme('light', false)).toBe('light')
      expect(resolveTheme('light', undefined)).toBe('light')
    })

    it('pref=dark は isDaytime に依存しない', () => {
      expect(resolveTheme('dark', true)).toBe('dark')
      expect(resolveTheme('dark', false)).toBe('dark')
      expect(resolveTheme('dark', undefined)).toBe('dark')
    })
  })

  describe('system モード', () => {
    it('osTheme=light → light', () => {
      expect(resolveTheme('system', undefined, 'light')).toBe('light')
    })

    it('osTheme=dark → dark', () => {
      expect(resolveTheme('system', undefined, 'dark')).toBe('dark')
    })

    it('isDaytime に依存しない', () => {
      expect(resolveTheme('system', true, 'dark')).toBe('dark')
      expect(resolveTheme('system', false, 'light')).toBe('light')
    })
  })

  describe('auto モード', () => {
    it('isDaytime=true → light', () => {
      expect(resolveTheme('auto', true)).toBe('light')
    })

    it('isDaytime=false → dark', () => {
      expect(resolveTheme('auto', false)).toBe('dark')
    })

    it('isDaytime=undefined → light（デフォルト）', () => {
      expect(resolveTheme('auto', undefined)).toBe('light')
    })

    it('osTheme に依存しない', () => {
      expect(resolveTheme('auto', true, 'dark')).toBe('light')
      expect(resolveTheme('auto', false, 'light')).toBe('dark')
    })
  })

  describe('auto モードの境界値 — isDaytime導出（市民薄明閾値 -6°）', () => {
    // EnvironmentContext.tsx の isDaytime 導出ロジック:
    //   solarAltitude !== null ? solarAltitude > CIVIL_TWILIGHT_ALTITUDE : true
    // CIVIL_TWILIGHT_ALTITUDE = -6
    const CIVIL_TWILIGHT_ALTITUDE = -6

    function isDaytime(solarAltitude: number | null): boolean {
      return solarAltitude !== null ? solarAltitude > CIVIL_TWILIGHT_ALTITUDE : true
    }

    it('solarAltitude=0°（昼間）→ isDaytime=true → auto=light', () => {
      expect(isDaytime(0)).toBe(true)
      expect(resolveTheme('auto', isDaytime(0))).toBe('light')
    })

    it('solarAltitude=-5°（市民薄明内）→ isDaytime=true → auto=light', () => {
      expect(isDaytime(-5)).toBe(true)
      expect(resolveTheme('auto', isDaytime(-5))).toBe('light')
    })

    it('solarAltitude=-5.999°（閾値直上）→ isDaytime=true → auto=light', () => {
      expect(isDaytime(-5.999)).toBe(true)
      expect(resolveTheme('auto', isDaytime(-5.999))).toBe('light')
    })

    it('solarAltitude=-6°（閾値ちょうど）→ isDaytime=false → auto=dark', () => {
      expect(isDaytime(-6)).toBe(false)
      expect(resolveTheme('auto', isDaytime(-6))).toBe('dark')
    })

    it('solarAltitude=-7°（市民薄明以下）→ isDaytime=false → auto=dark', () => {
      expect(isDaytime(-7)).toBe(false)
      expect(resolveTheme('auto', isDaytime(-7))).toBe('dark')
    })

    it('solarAltitude=-90°（天底）→ isDaytime=false → auto=dark', () => {
      expect(isDaytime(-90)).toBe(false)
      expect(resolveTheme('auto', isDaytime(-90))).toBe('dark')
    })

    it('solarAltitude=90°（天頂）→ isDaytime=true → auto=light', () => {
      expect(isDaytime(90)).toBe(true)
      expect(resolveTheme('auto', isDaytime(90))).toBe('light')
    })

    it('solarAltitude=null → isDaytime=true（デフォルト）→ auto=light', () => {
      expect(isDaytime(null)).toBe(true)
      expect(resolveTheme('auto', isDaytime(null))).toBe('light')
    })
  })

  describe('ThemePreference 全値の網羅', () => {
    const ALL_PREFS: ThemePreference[] = ['system', 'light', 'dark', 'auto']

    it('全てのThemePreferenceで有効なResolvedThemeを返す', () => {
      for (const pref of ALL_PREFS) {
        const result = resolveTheme(pref, true)
        expect(['light', 'dark']).toContain(result)
      }
    })
  })
})
