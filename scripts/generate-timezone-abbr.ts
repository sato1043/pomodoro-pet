/**
 * タイムゾーン略称マッピングの事前生成スクリプト
 *
 * tz-lookupが返す全IANAタイムゾーン名に対して、
 * システムのtzdata（date +%Z）から正確な略称を取得する。
 *
 * 出力: assets/data/timezone-abbr.json
 * 形式: { [ianaName: string]: string | [standard, daylight, standardOffsetMinutes] }
 *
 * 使い方: npx tsx scripts/generate-timezone-abbr.ts
 */
import { execSync } from 'child_process'
import { writeFileSync } from 'fs'
import { resolve } from 'path'
import tzlookup from 'tz-lookup'

/** tz-lookupが返す全IANAタイムゾーン名を収集する */
export function collectTimezoneNames(): string[] {
  const names = new Set<string>()
  for (let lat = -85; lat <= 85; lat += 1) {
    for (let lon = -180; lon <= 180; lon += 1) {
      try {
        names.add(tzlookup(lat, lon))
      } catch {
        // 海上等で解決できない場合はスキップ
      }
    }
  }
  return [...names].sort()
}

/** システムのdateコマンドでタイムゾーン略称を取得する */
function getAbbreviation(tz: string, dateStr: string): string {
  try {
    return execSync(`TZ='${tz}' date -d '${dateStr}' +%Z`, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

/** 指定日のUTCオフセット（分）を取得する */
function getOffsetMinutes(tz: string, dateStr: string): number {
  try {
    // +%z → +0900 形式
    const offset = execSync(`TZ='${tz}' date -d '${dateStr}' +%z`, { encoding: 'utf8' }).trim()
    const sign = offset[0] === '-' ? -1 : 1
    const h = parseInt(offset.slice(1, 3), 10)
    const m = parseInt(offset.slice(3, 5), 10)
    return sign * (h * 60 + m)
  } catch {
    return 0
  }
}

/** 略称マッピングを生成する */
export function generateTimezoneAbbr(
  names: string[]
): Record<string, string | [string, string, number]> {
  const result: Record<string, string | [string, string, number]> = {}

  // 冬(1月)と夏(7月)の略称を比較してDSTの有無を判定
  const winterDate = '2026-01-15'
  const summerDate = '2026-07-15'

  for (const tz of names) {
    // Etc/* はスキップ（フォールバックで処理するため）
    if (tz.startsWith('Etc/')) continue

    const winterAbbr = getAbbreviation(tz, winterDate)
    const summerAbbr = getAbbreviation(tz, summerDate)

    if (!winterAbbr || !summerAbbr) continue

    if (winterAbbr === summerAbbr) {
      // DST なし
      result[tz] = winterAbbr
    } else {
      // DST あり: 標準時 = UTC差が小さい方（DST = standard + 60min）
      const winterOffset = getOffsetMinutes(tz, winterDate)
      const summerOffset = getOffsetMinutes(tz, summerDate)
      if (winterOffset <= summerOffset) {
        // 標準=冬（北半球パターン: EST=-300, EDT=-240）
        result[tz] = [winterAbbr, summerAbbr, winterOffset]
      } else {
        // 標準=夏（南半球パターン: AEST=600, AEDT=660）
        result[tz] = [summerAbbr, winterAbbr, summerOffset]
      }
    }
  }

  // ポストプロセス: システムtzdataが名前付き略称を持たない地域の補正
  // アルゼンチン（America/Argentina/*）: "-03" → "ART" (Argentina Time)
  // ART はIANA公式略称ではないが、現地で広く認識されている略称
  for (const tz of Object.keys(result)) {
    if (tz.startsWith('America/Argentina/')) {
      const val = result[tz]
      if (val === '-03') {
        result[tz] = 'ART'
      } else if (Array.isArray(val) && val[0] === '-03') {
        result[tz] = ['ART', val[1], val[2]]
      }
    }
  }

  return result
}

// --- メイン ---
const isDirectRun = process.argv[1]?.includes('generate-timezone-abbr')

if (isDirectRun) {
  console.log('Collecting timezone names from tz-lookup...')
  const names = collectTimezoneNames()
  console.log(`Found ${names.length} timezone names`)

  console.log('Generating abbreviation mapping...')
  const mapping = generateTimezoneAbbr(names)
  const entries = Object.keys(mapping).length
  const dstEntries = Object.values(mapping).filter(v => Array.isArray(v)).length
  console.log(`Generated ${entries} entries (${dstEntries} with DST)`)

  const outPath = resolve(__dirname, '../assets/data/timezone-abbr.json')
  writeFileSync(outPath, JSON.stringify(mapping, null, 2) + '\n')
  console.log(`Written to ${outPath}`)
}
