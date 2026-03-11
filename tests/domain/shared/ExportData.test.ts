import { describe, it, expect } from 'vitest'
import { validateExportData } from '../../../src/domain/shared/ExportData'

const CURRENT_VERSION = '0.9.0'

function validData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: '0.9.0',
    exportedAt: '2026-03-11T12:00:00.000Z',
    settings: { timer: { workMinutes: 25 } },
    statistics: { '2026-03-11': { completedCycles: 3 } },
    emotionHistory: { '2026-03-11': { affinity: 10 } },
    ...overrides,
  }
}

describe('validateExportData', () => {
  describe('正常系', () => {
    it('有効なデータでvalid=trueを返す', () => {
      const result = validateExportData(validData(), CURRENT_VERSION)
      expect(result).toEqual({ valid: true })
    })

    it('同じメジャーバージョンの旧バージョンを受け入れる', () => {
      const result = validateExportData(validData({ version: '0.8.1' }), CURRENT_VERSION)
      expect(result).toEqual({ valid: true })
    })

    it('空オブジェクトのsettings/statistics/emotionHistoryを受け入れる', () => {
      const result = validateExportData(
        validData({ settings: {}, statistics: {}, emotionHistory: {} }),
        CURRENT_VERSION,
      )
      expect(result).toEqual({ valid: true })
    })
  })

  describe('不正なデータ形式', () => {
    it('nullでvalid=falseを返す', () => {
      const result = validateExportData(null, CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not a JSON object')
    })

    it('文字列でvalid=falseを返す', () => {
      const result = validateExportData('string', CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not a JSON object')
    })

    it('配列でvalid=falseを返す', () => {
      const result = validateExportData([1, 2, 3], CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('not a JSON object')
    })

    it('undefinedでvalid=falseを返す', () => {
      const result = validateExportData(undefined, CURRENT_VERSION)
      expect(result.valid).toBe(false)
    })
  })

  describe('versionフィールド', () => {
    it('version欠損でvalid=falseを返す', () => {
      const data = validData()
      delete data.version
      const result = validateExportData(data, CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('version')
    })

    it('versionが数値でvalid=falseを返す', () => {
      const result = validateExportData(validData({ version: 1 }), CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('version')
    })

    it('versionが空文字でvalid=falseを返す', () => {
      const result = validateExportData(validData({ version: '' }), CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('version')
    })

    it('メジャーバージョン不一致でvalid=falseを返す', () => {
      const result = validateExportData(validData({ version: '1.0.0' }), CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Incompatible version')
    })
  })

  describe('exportedAtフィールド', () => {
    it('exportedAt欠損でvalid=falseを返す', () => {
      const data = validData()
      delete data.exportedAt
      const result = validateExportData(data, CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exportedAt')
    })

    it('exportedAtが空文字でvalid=falseを返す', () => {
      const result = validateExportData(validData({ exportedAt: '' }), CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('exportedAt')
    })
  })

  describe('settingsフィールド', () => {
    it('settings欠損でvalid=falseを返す', () => {
      const data = validData()
      delete data.settings
      const result = validateExportData(data, CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('settings')
    })

    it('settingsがnullでvalid=falseを返す', () => {
      const result = validateExportData(validData({ settings: null }), CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('settings')
    })

    it('settingsが配列でvalid=falseを返す', () => {
      const result = validateExportData(validData({ settings: [1, 2] }), CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('settings')
    })
  })

  describe('statisticsフィールド', () => {
    it('statistics欠損でvalid=falseを返す', () => {
      const data = validData()
      delete data.statistics
      const result = validateExportData(data, CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('statistics')
    })

    it('statisticsがnullでvalid=falseを返す', () => {
      const result = validateExportData(validData({ statistics: null }), CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('statistics')
    })
  })

  describe('emotionHistoryフィールド', () => {
    it('emotionHistory欠損でvalid=falseを返す', () => {
      const data = validData()
      delete data.emotionHistory
      const result = validateExportData(data, CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('emotionHistory')
    })

    it('emotionHistoryがnullでvalid=falseを返す', () => {
      const result = validateExportData(validData({ emotionHistory: null }), CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('emotionHistory')
    })

    it('emotionHistoryが文字列でvalid=falseを返す', () => {
      const result = validateExportData(validData({ emotionHistory: 'string' }), CURRENT_VERSION)
      expect(result.valid).toBe(false)
      expect(result.error).toContain('emotionHistory')
    })
  })

  describe('バージョン互換性', () => {
    it('v0.x.x同士は互換性あり', () => {
      const result = validateExportData(validData({ version: '0.1.0' }), '0.9.0')
      expect(result.valid).toBe(true)
    })

    it('v1.x.x同士は互換性あり', () => {
      const result = validateExportData(validData({ version: '1.2.3' }), '1.0.0')
      expect(result.valid).toBe(true)
    })

    it('v0.x.xとv1.x.xは互換性なし', () => {
      const result = validateExportData(validData({ version: '0.9.0' }), '1.0.0')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Incompatible')
    })
  })
})
