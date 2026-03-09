import { describe, it, expect } from 'vitest'
import { resolveTimezone, getLocationTime, formatTimezoneLabel } from '../../../src/domain/environment/value-objects/Timezone'

describe('resolveTimezone', () => {
  it('Tokyo（陸上座標）はAsia/Tokyoを返す', () => {
    expect(resolveTimezone(35.6762, 139.6503)).toBe('Asia/Tokyo')
  })

  it('Honolulu（Hawaii）はPacific/Honoluluを返す', () => {
    expect(resolveTimezone(21.3069, -157.8583)).toBe('Pacific/Honolulu')
  })

  it('LondonはEurope/Londonを返す', () => {
    expect(resolveTimezone(51.5074, -0.1278)).toBe('Europe/London')
  })

  it('New YorkはAmerica/New_Yorkを返す', () => {
    expect(resolveTimezone(40.7128, -74.0060)).toBe('America/New_York')
  })

  it('DubaiはAsia/Dubaiを返す', () => {
    expect(resolveTimezone(25.2048, 55.2708)).toBe('Asia/Dubai')
  })

  it('海上座標でもエラーにならずEtc/GMTベースを返す', () => {
    // 太平洋上（陸から遠い座標）
    const tz = resolveTimezone(0, -170)
    expect(tz).toBeDefined()
    expect(typeof tz).toBe('string')
  })
})

describe('getLocationTime', () => {
  it('UTC基準の時刻をタイムゾーンに変換する', () => {
    // 2026-01-01 00:00:00 UTC
    const date = new Date('2026-01-01T00:00:00Z')
    const tokyo = getLocationTime(date, 'Asia/Tokyo')
    // JST = UTC+9
    expect(tokyo.hours).toBe(9)
    expect(tokyo.minutes).toBe(0)
  })

  it('Hawaii時刻を正しく返す', () => {
    // 2026-01-01 00:00:00 UTC
    const date = new Date('2026-01-01T00:00:00Z')
    const hawaii = getLocationTime(date, 'Pacific/Honolulu')
    // HST = UTC-10
    expect(hawaii.hours).toBe(14) // 前日14時
    expect(hawaii.minutes).toBe(0)
  })
})

describe('formatTimezoneLabel', () => {
  it('TokyoのラベルはJST', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    expect(formatTimezoneLabel('Asia/Tokyo', date)).toBe('JST')
  })

  it('HawaiiのラベルはHST', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    expect(formatTimezoneLabel('Pacific/Honolulu', date)).toBe('HST')
  })

  it('New York冬はEST', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    expect(formatTimezoneLabel('America/New_York', date)).toBe('EST')
  })

  it('New York夏はEDT', () => {
    const date = new Date('2026-06-01T00:00:00Z')
    expect(formatTimezoneLabel('America/New_York', date)).toBe('EDT')
  })

  it('マッピングにないタイムゾーンはGMT+Nを返す', () => {
    const date = new Date('2026-01-01T00:00:00Z')
    const label = formatTimezoneLabel('Etc/GMT-9', date)
    expect(label).toBe('GMT+9')
  })
})
