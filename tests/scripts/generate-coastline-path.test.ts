import { describe, it, expect } from 'vitest'
import {
  ringToSubpath,
  lineToSubpath,
  landFeaturesToSvgPath,
  extractIdlPath,
} from '../../scripts/generate-coastline-path'
import type { GeoJsonFeature } from '../../scripts/generate-coastline-path'

describe('ringToSubpath', () => {
  it('3点以上のリングをSVGパスに変換する', () => {
    // GeoJSONリングは始点=終点の閉じた座標列
    // SVG出力: M(始点) L(中間点...) L(終点=始点) Z
    const ring = [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]
    const path = ringToSubpath(ring)
    expect(path).toBe('M0 0L10 0L10 -10L0 -10L0 0Z')
  })

  it('座標を小数第1位に丸める', () => {
    const ring = [[0.123, 0.456], [10.789, 0.111], [5.555, 5.555], [0.123, 0.456]]
    const path = ringToSubpath(ring)
    expect(path).toBe('M0.1 -0.5L10.8 -0.1L5.6 -5.6L0.1 -0.5Z')
  })

  it('2点以下のリングは空文字列を返す', () => {
    expect(ringToSubpath([[0, 0], [1, 1]])).toBe('')
  })

  it('空配列は空文字列を返す', () => {
    expect(ringToSubpath([])).toBe('')
  })

  it('負の座標を正しく変換する（南半球・西半球）', () => {
    const ring = [[-180, -90], [-170, -90], [-170, -80], [-180, -80], [-180, -90]]
    const path = ringToSubpath(ring)
    expect(path).toBe('M-180 90L-170 90L-170 80L-180 80L-180 90Z')
  })
})

describe('lineToSubpath', () => {
  it('2点以上のラインをSVGパスに変換する（Zなし）', () => {
    const coords = [[180, 90], [180, 0], [180, -90]]
    const path = lineToSubpath(coords)
    expect(path).toBe('M180 -90L180 0L180 90')
  })

  it('座標を小数第1位に丸める', () => {
    const coords = [[179.99, 67.123], [172.456, 52.789]]
    const path = lineToSubpath(coords)
    expect(path).toBe('M180 -67.1L172.5 -52.8')
  })

  it('1点以下は空文字列を返す', () => {
    expect(lineToSubpath([[0, 0]])).toBe('')
    expect(lineToSubpath([])).toBe('')
  })
})

describe('landFeaturesToSvgPath', () => {
  it('Polygon featureをSVGパスに変換する', () => {
    const features: GeoJsonFeature[] = [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]],
      },
    }]
    const path = landFeaturesToSvgPath(features)
    expect(path).toBe('M0 0L10 0L10 -10L0 -10L0 0Z')
  })

  it('MultiPolygon featureをSVGパスに変換する', () => {
    const features: GeoJsonFeature[] = [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [[[0, 0], [5, 0], [5, 5], [0, 5], [0, 0]]],
          [[[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]],
        ],
      },
    }]
    const path = landFeaturesToSvgPath(features)
    expect(path).toBe('M0 0L5 0L5 -5L0 -5L0 0ZM10 -10L20 -10L20 -20L10 -20L10 -10Z')
  })

  it('複数featureを結合する', () => {
    const features: GeoJsonFeature[] = [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[[0, 0], [5, 0], [5, 5], [0, 0]]],
        },
      },
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [[[10, 10], [20, 10], [20, 20], [10, 10]]],
        },
      },
    ]
    const path = landFeaturesToSvgPath(features)
    expect(path).toContain('M0 0')
    expect(path).toContain('M10 -10')
  })

  it('PolygonでもMultiPolygonでもないgeometryは無視する', () => {
    const features: GeoJsonFeature[] = [{
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [[0, 0], [10, 10]],
      },
    }]
    const path = landFeaturesToSvgPath(features)
    expect(path).toBe('')
  })
})

describe('extractIdlPath', () => {
  it('featurecla="Date line"のLineStringを抽出する', () => {
    const features: GeoJsonFeature[] = [{
      type: 'Feature',
      properties: { featurecla: 'Date line', name: 'International Date Line' },
      geometry: {
        type: 'LineString',
        coordinates: [[180, 90], [180, 0], [180, -90]],
      },
    }]
    const path = extractIdlPath(features)
    expect(path).toBe('M180 -90L180 0L180 90')
  })

  it('featurecla="Date line"のMultiLineStringを処理する', () => {
    const features: GeoJsonFeature[] = [{
      type: 'Feature',
      properties: { featurecla: 'Date line' },
      geometry: {
        type: 'MultiLineString',
        coordinates: [
          [[180, 90], [180, 50]],
          [[180, -50], [180, -90]],
        ],
      },
    }]
    const path = extractIdlPath(features)
    expect(path).toContain('M180 -90L180 -50')
    expect(path).toContain('M180 50L180 90')
  })

  it('featurecla="Date line"以外のfeatureは無視する', () => {
    const features: GeoJsonFeature[] = [
      {
        type: 'Feature',
        properties: { featurecla: 'Equator' },
        geometry: { type: 'LineString', coordinates: [[-180, 0], [180, 0]] },
      },
      {
        type: 'Feature',
        properties: { featurecla: 'Date line' },
        geometry: { type: 'LineString', coordinates: [[180, 90], [180, -90]] },
      },
    ]
    const path = extractIdlPath(features)
    expect(path).not.toContain('M-180')
    expect(path).toBe('M180 -90L180 90')
  })

  it('Date line featureが存在しない場合は空文字列を返す', () => {
    const features: GeoJsonFeature[] = [{
      type: 'Feature',
      properties: { featurecla: 'Equator' },
      geometry: { type: 'LineString', coordinates: [[-180, 0], [180, 0]] },
    }]
    expect(extractIdlPath(features)).toBe('')
  })
})
