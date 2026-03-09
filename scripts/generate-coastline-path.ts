#!/usr/bin/env node
/**
 * 陸地・日付変更線SVGパス生成スクリプト
 *
 * Natural Earth 110mデータをダウンロードし、SVGパス文字列に変換して
 * assets/data/coastline-path.json に出力する。
 *
 * データソース（いずれもPublic Domain）:
 * - ne_110m_land: 陸地ポリゴン（Polygon/MultiPolygon）
 * - ne_110m_geographic_lines: 日付変更線（MultiLineString, featurecla="Date line"）
 *
 * Usage: npx tsx scripts/generate-coastline-path.ts
 *
 * https://www.naturalearthdata.com/
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const LAND_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'
const GEOLINES_URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_geographic_lines.geojson'
const OUTPUT_DIR = join(process.cwd(), 'assets', 'data')
const OUTPUT_FILE = join(OUTPUT_DIR, 'coastline-path.json')

export interface GeoJsonFeature {
  type: string
  properties: Record<string, unknown>
  geometry: {
    type: string
    coordinates: number[][] | number[][][] | number[][][][]
  }
}

interface GeoJson {
  type: string
  features: GeoJsonFeature[]
}

function round(n: number): number {
  return Math.round(n * 10) / 10
}

// --- 陸地ポリゴン ---

export function ringToSubpath(ring: number[][]): string {
  if (ring.length < 3) return ''
  const [startLon, startLat] = ring[0]
  let d = `M${round(startLon)} ${round(-startLat)}`
  for (let i = 1; i < ring.length; i++) {
    const [lon, lat] = ring[i]
    d += `L${round(lon)} ${round(-lat)}`
  }
  d += 'Z'
  return d
}

export function landFeaturesToSvgPath(features: GeoJsonFeature[]): string {
  const parts: string[] = []
  for (const feature of features) {
    const { type, coordinates } = feature.geometry
    if (type === 'Polygon') {
      for (const ring of coordinates as number[][][]) {
        const sub = ringToSubpath(ring)
        if (sub) parts.push(sub)
      }
    } else if (type === 'MultiPolygon') {
      for (const polygon of coordinates as number[][][][]) {
        for (const ring of polygon) {
          const sub = ringToSubpath(ring)
          if (sub) parts.push(sub)
        }
      }
    }
  }
  return parts.join('')
}

// --- 日付変更線 ---

export function lineToSubpath(coords: number[][]): string {
  if (coords.length < 2) return ''
  const [startLon, startLat] = coords[0]
  let d = `M${round(startLon)} ${round(-startLat)}`
  for (let i = 1; i < coords.length; i++) {
    const [lon, lat] = coords[i]
    d += `L${round(lon)} ${round(-lat)}`
  }
  return d
}

export function extractIdlPath(features: GeoJsonFeature[]): string {
  const parts: string[] = []
  for (const feature of features) {
    const featurecla = feature.properties.featurecla as string | undefined
    if (featurecla !== 'Date line') continue

    const { type, coordinates } = feature.geometry
    if (type === 'LineString') {
      const sub = lineToSubpath(coordinates as number[][])
      if (sub) parts.push(sub)
    } else if (type === 'MultiLineString') {
      for (const line of coordinates as number[][][]) {
        const sub = lineToSubpath(line)
        if (sub) parts.push(sub)
      }
    }
  }
  return parts.join('')
}

// --- メイン ---

async function fetchJson(url: string, label: string): Promise<GeoJson> {
  console.log(`Downloading ${label}...`)
  console.log(`  ${url}`)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  const json = await response.json() as GeoJson
  console.log(`  Features: ${json.features.length}`)
  return json
}

async function main(): Promise<void> {
  const assetsDir = join(process.cwd(), 'assets')
  if (!existsSync(assetsDir)) {
    console.error('Error: assets/ directory not found.')
    console.error('Initialize the submodule first: git submodule update --init')
    process.exit(1)
  }
  mkdirSync(OUTPUT_DIR, { recursive: true })

  const [landGeo, linesGeo] = await Promise.all([
    fetchJson(LAND_URL, 'Natural Earth 110m land polygons'),
    fetchJson(GEOLINES_URL, 'Natural Earth 110m geographic lines'),
  ])

  const landPath = landFeaturesToSvgPath(landGeo.features)
  console.log(`Land path: ${landPath.length} chars`)

  const idlPath = extractIdlPath(linesGeo.features)
  console.log(`IDL path: ${idlPath.length} chars`)

  const output = JSON.stringify({ path: landPath, idlPath })
  writeFileSync(OUTPUT_FILE, output)

  const sizeKB = (Buffer.byteLength(output) / 1024).toFixed(1)
  console.log(`Output: ${OUTPUT_FILE} (${sizeKB} KB)`)
}

// テスト時のimportではmain()を実行しない
const isDirectRun = process.argv[1]?.endsWith('generate-coastline-path.ts')
if (isDirectRun) {
  main().catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
