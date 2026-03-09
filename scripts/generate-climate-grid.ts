#!/usr/bin/env node
/**
 * 気候グリッドデータ生成スクリプト
 *
 * NASA POWER Climatology API (1991-2020) から5度格子の気候データを取得し、
 * assets/data/climate-grid.json に出力する。
 *
 * Usage: npx tsx scripts/generate-climate-grid.ts [--pretty]
 *
 * 中間結果は tmp/climate-cache/ にキャッシュされ、中断・再開が可能。
 * キャッシュクリア: rm -rf tmp/climate-cache/
 *
 * Data source: NASA POWER (Prediction Of Worldwide Energy Resources)
 * https://power.larc.nasa.gov/
 * Based on CERES/MERRA-2 reanalysis, 1991-2020 climatological normals.
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'

// --- 定数 ---

const GRID_STEP = 5
const LAT_MIN = -87.5
const LAT_MAX = 87.5
const LON_MIN = -177.5
const LON_MAX = 177.5

const NASA_POWER_BASE = 'https://power.larc.nasa.gov/api/temporal/climatology/point'
const PARAMETERS = 'T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M'
const COMMUNITY = 'AG'

const CACHE_DIR = join(process.cwd(), 'tmp', 'climate-cache')
const OUTPUT_DIR = join(process.cwd(), 'assets', 'data')
const OUTPUT_FILE = join(OUTPUT_DIR, 'climate-grid.json')

const RATE_LIMIT_MS = 700 // ~1.4 req/sec, under 100/min
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 5000

const MONTH_KEYS = [
  'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
  'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC',
]

// --- 型 ---

interface GridPoint {
  lat: number
  lon: number
  months: [number, number, number, number, number][]
}

interface ClimateGridJson {
  meta: {
    source: string
    resolution: number
    generatedAt: string
    license: string
  }
  grid: GridPoint[]
}

// --- ヘルパー ---

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function cacheFile(lat: number, lon: number): string {
  return join(CACHE_DIR, `${lat.toFixed(1)}_${lon.toFixed(1)}.json`)
}

function readCache(lat: number, lon: number): GridPoint | null {
  const file = cacheFile(lat, lon)
  if (!existsSync(file)) return null
  try {
    return JSON.parse(readFileSync(file, 'utf-8'))
  } catch {
    return null
  }
}

function writeCache(lat: number, lon: number, data: GridPoint): void {
  writeFileSync(cacheFile(lat, lon), JSON.stringify(data))
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}m ${s.toString().padStart(2, '0')}s`
}

// --- API ---

async function fetchGridPoint(lat: number, lon: number): Promise<GridPoint | null> {
  const url = `${NASA_POWER_BASE}?parameters=${PARAMETERS}&community=${COMMUNITY}&longitude=${lon}&latitude=${lat}&format=JSON`

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        if (attempt < MAX_RETRIES) {
          process.stderr.write(`\n  HTTP ${response.status} for (${lat}, ${lon}), retry ${attempt}/${MAX_RETRIES}...\n`)
          await sleep(RETRY_DELAY_MS * attempt)
          continue
        }
        process.stderr.write(`\n  HTTP ${response.status} for (${lat}, ${lon}), skipping\n`)
        return null
      }

      const data = await response.json() as {
        properties?: {
          parameter?: Record<string, Record<string, number>>
        }
      }
      const params = data?.properties?.parameter
      if (!params) {
        process.stderr.write(`\n  No parameter data for (${lat}, ${lon}), skipping\n`)
        return null
      }

      const months: [number, number, number, number, number][] = MONTH_KEYS.map(month => {
        const tavg = params.T2M?.[month]
        const tmax = params.T2M_MAX?.[month]
        const tmin = params.T2M_MIN?.[month]
        const prec = params.PRECTOTCORR?.[month]
        const humidity = params.RH2M?.[month]

        // NASA POWER uses -999 as fill value for missing data
        return [
          tavg != null && tavg > -900 ? round2(tavg) : 15,
          tmax != null && tmax > -900 ? round2(tmax) : 20,
          tmin != null && tmin > -900 ? round2(tmin) : 10,
          prec != null && prec > -900 ? round2(prec) : 100,
          humidity != null && humidity > -900 ? round2(humidity) : 60,
        ] as [number, number, number, number, number]
      })

      return { lat, lon, months }
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        process.stderr.write(`\n  Error for (${lat}, ${lon}): ${err}, retry ${attempt}/${MAX_RETRIES}...\n`)
        await sleep(RETRY_DELAY_MS * attempt)
        continue
      }
      process.stderr.write(`\n  Error for (${lat}, ${lon}): ${err}, skipping\n`)
      return null
    }
  }
  return null
}

// --- メイン ---

async function main(): Promise<void> {
  const pretty = process.argv.includes('--pretty')

  // assets/ ディレクトリ確認
  const assetsDir = join(process.cwd(), 'assets')
  if (!existsSync(assetsDir)) {
    console.error('Error: assets/ directory not found.')
    console.error('Initialize the submodule first: git submodule update --init')
    process.exit(1)
  }

  // ディレクトリ作成
  mkdirSync(CACHE_DIR, { recursive: true })
  mkdirSync(OUTPUT_DIR, { recursive: true })

  // 全格子点を列挙
  const gridCoords: Array<{ lat: number; lon: number }> = []
  for (let lat = LAT_MIN; lat <= LAT_MAX; lat += GRID_STEP) {
    for (let lon = LON_MIN; lon <= LON_MAX; lon += GRID_STEP) {
      gridCoords.push({ lat: round2(lat), lon: round2(lon) })
    }
  }

  const total = gridCoords.length
  console.log(`Climate grid generation: ${total} points (${GRID_STEP}° resolution)`)
  console.log(`Source: NASA POWER CERES/MERRA-2 Climatology (1991-2020)`)
  console.log(`Cache:  ${CACHE_DIR}`)
  console.log(`Output: ${OUTPUT_FILE}`)
  console.log()

  // キャッシュ済みの数を確認
  let cachedCount = 0
  for (const { lat, lon } of gridCoords) {
    if (readCache(lat, lon)) cachedCount++
  }
  if (cachedCount > 0) {
    console.log(`Resuming: ${cachedCount}/${total} points already cached`)
    console.log()
  }

  const results: GridPoint[] = []
  let processed = 0
  let fetched = 0
  const startTime = Date.now()

  for (const { lat, lon } of gridCoords) {
    processed++

    // キャッシュ確認
    const cached = readCache(lat, lon)
    if (cached) {
      results.push(cached)
      continue
    }

    // API呼び出し
    const point = await fetchGridPoint(lat, lon)
    fetched++

    if (point) {
      results.push(point)
      writeCache(lat, lon, point)
    }

    // 進捗表示
    const pct = ((processed / total) * 100).toFixed(1)
    const elapsed = (Date.now() - startTime) / 1000
    const eta = fetched > 0 ? (elapsed / fetched) * (total - cachedCount - fetched) : 0
    process.stdout.write(
      `\r[${processed.toString().padStart(4)}/${total}] `
      + `(${pct.padStart(5)}%) `
      + `lat=${lat.toString().padStart(6)} lon=${lon.toString().padStart(7)} `
      + `— ETA: ${formatTime(eta)}   `
    )

    // レート制限
    await sleep(RATE_LIMIT_MS)
  }

  console.log('\n')
  console.log(`Completed: ${results.length}/${total} points collected (${total - results.length} skipped)`)

  // JSON出力
  const output: ClimateGridJson = {
    meta: {
      source: 'NASA POWER CERES/MERRA-2 Climatology (1991-2020)',
      resolution: GRID_STEP,
      generatedAt: new Date().toISOString().slice(0, 10),
      license: 'NASA POWER data is freely available for use with proper attribution. https://power.larc.nasa.gov/',
    },
    grid: results,
  }

  const jsonStr = pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output)
  writeFileSync(OUTPUT_FILE, jsonStr)

  const sizeMB = (Buffer.byteLength(jsonStr) / 1024 / 1024).toFixed(2)
  console.log(`Output: ${OUTPUT_FILE} (${sizeMB} MB)`)
  console.log()
  console.log('Next steps:')
  console.log('  cd assets && git add data/climate-grid.json && git commit -m "Add climate grid data (NASA POWER)"')
  console.log('  cd .. && git add assets && git commit -m "Update assets submodule (climate grid data)"')
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
