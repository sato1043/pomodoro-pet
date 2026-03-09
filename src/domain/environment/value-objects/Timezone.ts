import _tzlookup from 'tz-lookup'
import tzAbbrData from '../../../../assets/data/timezone-abbr.json'

// CJS default export interop: Viteバンドル時にmodule.exportsが{default: fn}になる場合がある
const tzlookup: (lat: number, lon: number) => string =
  typeof _tzlookup === 'function'
    ? _tzlookup
    : (_tzlookup as unknown as { default: (lat: number, lon: number) => string }).default

/** 事前生成済みタイムゾーン略称マッピング（386エントリ、103 DST対応） */
const TZ_ABBR = tzAbbrData as Record<string, string | [string, string, number]>

/** 緯度経度からIANAタイムゾーン名を解決する */
export function resolveTimezone(latitude: number, longitude: number): string {
  try {
    return tzlookup(latitude, longitude)
  } catch {
    // 海上など境界外の場合は経度から概算
    const offsetHours = Math.round(longitude / 15)
    // Etc/GMT の符号は逆（Etc/GMT-9 = UTC+9）
    return `Etc/GMT${offsetHours <= 0 ? '+' : '-'}${Math.abs(offsetHours)}`
  }
}

/** 指定タイムゾーンでの現在時刻の時・分・秒を返す */
export function getLocationTime(
  date: Date,
  timezone: string
): { hours: number; minutes: number; seconds: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  }).formatToParts(date)

  const get = (type: string): number =>
    Number(parts.find(p => p.type === type)?.value ?? 0)

  return {
    hours: get('hour'),
    minutes: get('minute'),
    seconds: get('second'),
  }
}

/** 現在のUTCオフセット（分）を取得 */
function getUtcOffsetMinutes(date: Date, timezone: string): number {
  const utc = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const local = new Date(date.toLocaleString('en-US', { timeZone: timezone }))
  return Math.round((local.getTime() - utc.getTime()) / 60000)
}

/** タイムゾーンの略称ラベルを返す（例: "JST", "EST", "GMT+9"） */
export function formatTimezoneLabel(timezone: string, date: Date): string {
  const entry = TZ_ABBR[timezone]
  if (typeof entry === 'string') return entry
  if (Array.isArray(entry)) {
    const currentOffset = getUtcOffsetMinutes(date, timezone)
    return currentOffset === entry[2] ? entry[0] : entry[1]
  }
  // マッピングにないタイムゾーン（Etc/*等）: UTCオフセットから生成
  const offset = getUtcOffsetMinutes(date, timezone)
  if (offset === 0) return 'GMT'
  const sign = offset > 0 ? '+' : '-'
  const absH = Math.floor(Math.abs(offset) / 60)
  const absM = Math.abs(offset) % 60
  return absM > 0 ? `GMT${sign}${absH}:${String(absM).padStart(2, '0')}` : `GMT${sign}${absH}`
}
