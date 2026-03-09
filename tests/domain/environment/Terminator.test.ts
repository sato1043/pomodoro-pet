import { describe, it, expect } from 'vitest'
import { computeTerminatorPolygon } from '../../../src/domain/environment/value-objects/Terminator'

/** ポイント文字列をパースして{lon, svgY}配列を返す */
function parsePoints(polygon: string): { lon: number; svgY: number }[] {
  return polygon.split(' ').map(pair => {
    const [lon, svgY] = pair.split(',').map(Number)
    return { lon, svgY }
  })
}

describe('computeTerminatorPolygon', () => {
  it('spring equinox (declination=0, gha=0): terminator沿いの緯度は赤道付近', () => {
    const polygon = computeTerminatorPolygon(0, 0)
    const points = parsePoints(polygon)

    // terminatorポイント（閉じポイントを除く）
    const terminatorPoints = points.slice(0, -2)
    // declination=0のとき、太陽直下点の経度ではlat=0（赤道）
    // 180°離れた経度でもlat=0
    // 全ポイントのsvgY（= -lat）が-90〜90の範囲
    for (const p of terminatorPoints) {
      expect(p.svgY).toBeGreaterThanOrEqual(-90)
      expect(p.svgY).toBeLessThanOrEqual(90)
    }
  })

  it('summer solstice (declination=23.44): 夜側閉じポイントが南極側', () => {
    const polygon = computeTerminatorPolygon(23.44, 0)
    const points = parsePoints(polygon)

    // declination>=0 → 夜側は南極（svgY=90）で閉じる
    const lastTwo = points.slice(-2)
    expect(lastTwo[0]).toEqual({ lon: 180, svgY: 90 })
    expect(lastTwo[1]).toEqual({ lon: -180, svgY: 90 })
  })

  it('winter solstice (declination=-23.44): 夜側閉じポイントが北極側', () => {
    const polygon = computeTerminatorPolygon(-23.44, 0)
    const points = parsePoints(polygon)

    // declination<0 → 夜側は北極（svgY=-90）で閉じる
    const lastTwo = points.slice(-2)
    expect(lastTwo[0]).toEqual({ lon: 180, svgY: -90 })
    expect(lastTwo[1]).toEqual({ lon: -180, svgY: -90 })
  })

  it('negative declination: subsolar meridianのterminatorが北半球にある', () => {
    // dec=-5°, gha=0 → 太陽直下点は5°S, 0°E
    // subsolar meridian(lon=0)でのterminatorは約85°N（svgY≈-85）
    const polygon = computeTerminatorPolygon(-5, 0)
    const points = parsePoints(polygon)
    const terminatorPoints = points.slice(0, -2)

    // lon=0のポイント
    const atSubsolar = terminatorPoints.find(p => p.lon === 0)!
    // svgY = -lat なので、lat=85°N → svgY≈-85
    expect(atSubsolar.svgY).toBeLessThan(-80)
    expect(atSubsolar.svgY).toBeGreaterThan(-90)
  })

  it('negative declination: antisolar meridianのterminatorが南半球にある', () => {
    // dec=-5°, gha=0 → antisolar meridian(lon=180)でのterminatorは約85°S（svgY≈85）
    const polygon = computeTerminatorPolygon(-5, 0)
    const points = parsePoints(polygon)
    const terminatorPoints = points.slice(0, -2)

    // lon=180のポイント
    const atAntisolar = terminatorPoints.find(p => p.lon === 180)!
    // svgY = -lat なので、lat=-85°S → svgY≈85
    expect(atAntisolar.svgY).toBeGreaterThan(80)
    expect(atAntisolar.svgY).toBeLessThan(90)
  })

  it('ghaオフセットでterminatorが経度方向にシフトする', () => {
    const poly0 = parsePoints(computeTerminatorPolygon(10, 0))
    const poly90 = parsePoints(computeTerminatorPolygon(10, 90))

    // 同一経度のポイントでsvgYが異なる（シフトしている）
    const idx0 = poly0.findIndex(p => p.lon === 0)
    const idx90 = poly90.findIndex(p => p.lon === 0)
    expect(poly0[idx0].svgY).not.toBeCloseTo(poly90[idx90].svgY, 0)
  })

  it('経度範囲が-180〜+180をカバーする', () => {
    const polygon = computeTerminatorPolygon(15, 45)
    const points = parsePoints(polygon)

    const terminatorPoints = points.slice(0, -2)
    expect(terminatorPoints[0].lon).toBe(-180)
    expect(terminatorPoints[terminatorPoints.length - 1].lon).toBe(180)
  })

  it('ポイント数 = (360/2 + 1) terminator + 2 closing = 183', () => {
    const polygon = computeTerminatorPolygon(0, 0)
    const points = parsePoints(polygon)
    expect(points).toHaveLength(183)
  })
})
