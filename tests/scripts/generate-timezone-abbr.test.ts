import { describe, it, expect } from 'vitest'
import { generateTimezoneAbbr } from '../../scripts/generate-timezone-abbr'

describe('generateTimezoneAbbr', () => {
  it('Etc/*エントリはスキップされる', () => {
    const result = generateTimezoneAbbr(['Etc/GMT', 'Etc/GMT-9', 'Etc/UTC'])
    expect(Object.keys(result)).toHaveLength(0)
  })

  it('DST なしのタイムゾーンは文字列を返す', () => {
    const result = generateTimezoneAbbr(['Asia/Tokyo'])
    expect(result['Asia/Tokyo']).toBe('JST')
  })

  it('DST ありのタイムゾーンは[standard, daylight, offset]配列を返す', () => {
    const result = generateTimezoneAbbr(['America/New_York'])
    const entry = result['America/New_York']
    expect(Array.isArray(entry)).toBe(true)
    if (Array.isArray(entry)) {
      expect(entry[0]).toBe('EST')
      expect(entry[1]).toBe('EDT')
      expect(entry[2]).toBe(-300)
    }
  })

  it('南半球DSTのタイムゾーンは標準=夏の順序で返す', () => {
    const result = generateTimezoneAbbr(['Australia/Sydney'])
    const entry = result['Australia/Sydney']
    expect(Array.isArray(entry)).toBe(true)
    if (Array.isArray(entry)) {
      expect(entry[0]).toBe('AEST')
      expect(entry[1]).toBe('AEDT')
      expect(entry[2]).toBe(600) // UTC+10
    }
  })

  it('America/Argentina/*の"-03"は"ART"にポストプロセスされる', () => {
    const result = generateTimezoneAbbr([
      'America/Argentina/Buenos_Aires',
      'America/Argentina/Ushuaia',
    ])
    expect(result['America/Argentina/Buenos_Aires']).toBe('ART')
    expect(result['America/Argentina/Ushuaia']).toBe('ART')
  })

  it('America/Punta_Arenasの"-03"はARTにポストプロセスされない', () => {
    const result = generateTimezoneAbbr(['America/Punta_Arenas'])
    // チリのタイムゾーンなのでART補正の対象外
    expect(result['America/Punta_Arenas']).toBe('-03')
  })
})
