import { describe, it, expect, vi } from 'vitest'

// vanilla-extract CSSモジュールをモック（vitest環境ではvanilla-extractが動作しない）
vi.mock('../../../src/adapters/ui/styles/world-map-modal.css', () => ({}))
vi.mock('../../../src/adapters/ui/styles/free-timer-panel.css', () => ({}))

import { normalizeLon } from '../../../src/adapters/ui/WorldMapModal'

describe('normalizeLon', () => {
  it('0はそのまま0を返す', () => {
    expect(normalizeLon(0)).toBe(0)
  })

  it('正の範囲内の値はそのまま返す', () => {
    expect(normalizeLon(90)).toBe(90)
    expect(normalizeLon(139.6503)).toBeCloseTo(139.6503)
  })

  it('負の範囲内の値はそのまま返す', () => {
    expect(normalizeLon(-90)).toBe(-90)
    expect(normalizeLon(-74.006)).toBeCloseTo(-74.006)
  })

  it('180は-180に正規化される', () => {
    expect(normalizeLon(180)).toBe(-180)
  })

  it('-180はそのまま-180を返す', () => {
    expect(normalizeLon(-180)).toBe(-180)
  })

  it('360は0に正規化される', () => {
    expect(normalizeLon(360)).toBe(0)
  })

  it('-360は0に正規化される', () => {
    expect(normalizeLon(-360)).toBe(0)
  })

  it('540は-180に正規化される（1.5周）', () => {
    expect(normalizeLon(540)).toBe(-180)
  })

  it('-540は-180に正規化される', () => {
    expect(normalizeLon(-540)).toBe(-180)
  })

  it('日付変更線を越える値が正しく正規化される', () => {
    // 東経170°から東に20°進むと西経170°
    expect(normalizeLon(190)).toBe(-170)
    // 西経170°から西に20°進むと東経170°
    expect(normalizeLon(-190)).toBe(170)
  })

  it('大きな正の値が正規化される', () => {
    expect(normalizeLon(720)).toBe(0)
    expect(normalizeLon(900)).toBe(-180)
  })
})
