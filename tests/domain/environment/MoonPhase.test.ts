import { describe, it, expect } from 'vitest'
import { generateMoonPhasePixels } from '../../../src/domain/environment/value-objects/MoonPhase'

describe('generateMoonPhasePixels', () => {
  const SIZE = 64

  it('正しいサイズのUint8ClampedArrayを返す', () => {
    const pixels = generateMoonPhasePixels(180, SIZE, 1.0)
    expect(pixels).toBeInstanceOf(Uint8ClampedArray)
    expect(pixels.length).toBe(SIZE * SIZE * 4)
  })

  it('新月（phaseDeg=0）: 中心ピクセルがほぼ暗い', () => {
    const pixels = generateMoonPhasePixels(0, SIZE, 0.0)
    const cx = Math.floor(SIZE / 2)
    const cy = Math.floor(SIZE / 2)
    const idx = (cy * SIZE + cx) * 4
    // 新月ではlit=0に近い（terminatorCos=1で右端）、中心は暗い側
    // 暗部の最低輝度darkSide = 0.03 * 0.5 * 255 ≈ 3.8
    expect(pixels[idx]).toBeLessThan(30)
    expect(pixels[idx + 1]).toBeLessThan(30)
    expect(pixels[idx + 2]).toBeLessThan(30)
  })

  it('満月（phaseDeg=180）: 中心ピクセルが明るい', () => {
    const pixels = generateMoonPhasePixels(180, SIZE, 1.0)
    const cx = Math.floor(SIZE / 2)
    const cy = Math.floor(SIZE / 2)
    const idx = (cy * SIZE + cx) * 4
    // 満月ではlit=1、brightness=1.0
    expect(pixels[idx]).toBeGreaterThan(100)
    expect(pixels[idx + 1]).toBeGreaterThan(100)
    expect(pixels[idx + 2]).toBeGreaterThan(100)
    expect(pixels[idx + 3]).toBe(255) // 中心はアルファ=255
  })

  it('角のピクセルは透明（円の外）', () => {
    const pixels = generateMoonPhasePixels(180, SIZE, 1.0)
    // 左上角 (0, 0)
    const idx = 0
    expect(pixels[idx + 3]).toBe(0) // alpha = 0
  })

  it('上弦（phaseDeg=90）: 右半分が明るく、左半分が暗い', () => {
    const pixels = generateMoonPhasePixels(90, SIZE, 0.5)
    const cy = Math.floor(SIZE / 2)
    // 右寄りのピクセル（3/4位置）
    const rightIdx = (cy * SIZE + Math.floor(SIZE * 3 / 4)) * 4
    // 左寄りのピクセル（1/4位置）
    const leftIdx = (cy * SIZE + Math.floor(SIZE * 1 / 4)) * 4
    // 右が左より明るい
    expect(pixels[rightIdx]).toBeGreaterThan(pixels[leftIdx])
  })

  it('下弦（phaseDeg=270）: 左半分が明るく、右半分が暗い', () => {
    const pixels = generateMoonPhasePixels(270, SIZE, 0.5)
    const cy = Math.floor(SIZE / 2)
    const rightIdx = (cy * SIZE + Math.floor(SIZE * 3 / 4)) * 4
    const leftIdx = (cy * SIZE + Math.floor(SIZE * 1 / 4)) * 4
    // 左が右より明るい
    expect(pixels[leftIdx]).toBeGreaterThan(pixels[rightIdx])
  })

  it('illuminationが高いほど明るい（同位相で比較）', () => {
    const dim = generateMoonPhasePixels(180, SIZE, 0.2)
    const bright = generateMoonPhasePixels(180, SIZE, 1.0)
    const cx = Math.floor(SIZE / 2)
    const cy = Math.floor(SIZE / 2)
    const idx = (cy * SIZE + cx) * 4
    expect(bright[idx]).toBeGreaterThan(dim[idx])
  })

  it('サイズ128でも正常に生成される', () => {
    const pixels = generateMoonPhasePixels(90, 128, 0.7)
    expect(pixels.length).toBe(128 * 128 * 4)
  })
})
