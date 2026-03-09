import type { ClimateGridPort, MonthlyClimateData } from '../../domain/environment/value-objects/ClimateData'

// --- グリッドデータJSON型 ---

export interface ClimateGridJson {
  readonly meta: {
    readonly source: string
    readonly resolution: number
    readonly generatedAt: string
    readonly license?: string
  }
  readonly grid: readonly ClimateGridPoint[]
}

interface ClimateGridPoint {
  readonly lat: number
  readonly lon: number
  readonly months: readonly [number, number, number, number, number][]
}

// --- 定数 ---

const GRID_STEP = 5
const LAT_COUNT = 36   // -87.5 to 87.5
const LON_COUNT = 72   // -177.5 to 177.5

// --- フィールドインデックス ---

const FIELD_TAVG = 0
const FIELD_TMAX = 1
const FIELD_TMIN = 2
const FIELD_PREC = 3
const FIELD_HUMIDITY = 4

// --- アダプター ---

export function createClimateGridAdapter(data: ClimateGridJson): ClimateGridPort {
  // 2次元配列: gridMap[latIdx][lonIdx] = ClimateGridPoint | null
  const gridMap: (ClimateGridPoint | null)[][] = Array.from({ length: LAT_COUNT }, () =>
    Array.from({ length: LON_COUNT }, () => null)
  )

  for (const point of data.grid) {
    const latIdx = Math.round((point.lat + 87.5) / GRID_STEP)
    const lonIdx = Math.round((point.lon + 177.5) / GRID_STEP)
    if (latIdx >= 0 && latIdx < LAT_COUNT && lonIdx >= 0 && lonIdx < LON_COUNT) {
      gridMap[latIdx][lonIdx] = point
    }
  }

  function indexToPoint(latIdx: number, lonIdx: number): ClimateGridPoint | null {
    if (latIdx < 0 || latIdx >= LAT_COUNT || gridMap.length === 0) return null
    const wrappedLon = ((lonIdx % LON_COUNT) + LON_COUNT) % LON_COUNT
    return gridMap[latIdx]?.[wrappedLon] ?? null
  }

  /** 最寄りの非null地点を探す（海洋スナップ） */
  function findNearest(latIdx: number, lonIdx: number): ClimateGridPoint | null {
    const point = indexToPoint(latIdx, lonIdx)
    if (point) return point

    // 近傍探索（最大半径5グリッド）
    for (let r = 1; r <= 5; r++) {
      for (let dlat = -r; dlat <= r; dlat++) {
        for (let dlon = -r; dlon <= r; dlon++) {
          if (Math.abs(dlat) !== r && Math.abs(dlon) !== r) continue
          const p = indexToPoint(latIdx + dlat, lonIdx + dlon)
          if (p) return p
        }
      }
    }
    return null
  }

  return {
    get isLoaded() { return true },

    getMonthlyClimate(latitude: number, longitude: number): readonly MonthlyClimateData[] {
      // 双線形補間のための4隅インデックス
      const latContinuous = (latitude + 87.5) / GRID_STEP
      const lonContinuous = (longitude + 177.5) / GRID_STEP

      const lat0 = Math.floor(latContinuous)
      const lat1 = Math.min(lat0 + 1, LAT_COUNT - 1)
      const lon0 = Math.floor(lonContinuous)
      const lon1 = (lon0 + 1) % LON_COUNT

      const tLat = latContinuous - lat0
      const tLon = lonContinuous - lon0

      // 4隅のデータ取得（海洋はスナップ）
      const p00 = findNearest(lat0, lon0)
      const p01 = findNearest(lat0, lon1)
      const p10 = findNearest(lat1, lon0)
      const p11 = findNearest(lat1, lon1)

      return Array.from({ length: 12 }, (_, monthIdx) => {
        const bilinear = (fieldIdx: number): number => {
          const v00 = p00?.months[monthIdx]?.[fieldIdx] ?? 15
          const v01 = p01?.months[monthIdx]?.[fieldIdx] ?? 15
          const v10 = p10?.months[monthIdx]?.[fieldIdx] ?? 15
          const v11 = p11?.months[monthIdx]?.[fieldIdx] ?? 15
          const bottom = v00 + (v01 - v00) * tLon
          const top = v10 + (v11 - v10) * tLon
          return bottom + (top - bottom) * tLat
        }

        return {
          month: monthIdx + 1,
          avgTempC: bilinear(FIELD_TAVG),
          avgHighTempC: bilinear(FIELD_TMAX),
          avgLowTempC: bilinear(FIELD_TMIN),
          avgPrecipMm: bilinear(FIELD_PREC),
          avgHumidity: bilinear(FIELD_HUMIDITY),
        }
      })
    },
  }
}
