import { describe, it, expect } from 'vitest'
import {
  MOON_PHASE_DEFINITIONS,
  findNearestMoonPhase,
} from '../../../src/domain/environment/value-objects/MoonPhaseName'

describe('MOON_PHASE_DEFINITIONS', () => {
  it('16個の定義がある', () => {
    expect(MOON_PHASE_DEFINITIONS).toHaveLength(16)
  })

  it('indexが0から連番', () => {
    MOON_PHASE_DEFINITIONS.forEach((def, i) => {
      expect(def.index).toBe(i)
    })
  })

  it('phaseDegが昇順', () => {
    for (let i = 1; i < MOON_PHASE_DEFINITIONS.length; i++) {
      expect(MOON_PHASE_DEFINITIONS[i].phaseDeg).toBeGreaterThan(MOON_PHASE_DEFINITIONS[i - 1].phaseDeg)
    }
  })

  it('illuminationが0.0〜1.0の範囲', () => {
    for (const def of MOON_PHASE_DEFINITIONS) {
      expect(def.illumination).toBeGreaterThanOrEqual(0)
      expect(def.illumination).toBeLessThanOrEqual(1)
    }
  })

  it('朔(index=0)はphaseDeg=0, illumination=0', () => {
    expect(MOON_PHASE_DEFINITIONS[0].phaseDeg).toBe(0)
    expect(MOON_PHASE_DEFINITIONS[0].illumination).toBe(0)
    expect(MOON_PHASE_DEFINITIONS[0].nameJa).toBe('朔')
  })

  it('望(index=7)はphaseDeg=180, illumination=1.0', () => {
    expect(MOON_PHASE_DEFINITIONS[7].phaseDeg).toBe(180)
    expect(MOON_PHASE_DEFINITIONS[7].illumination).toBe(1.0)
    expect(MOON_PHASE_DEFINITIONS[7].nameJa).toBe('望')
  })

  it('全定義に必須フィールドがある', () => {
    for (const def of MOON_PHASE_DEFINITIONS) {
      expect(def.nameJa).toBeTruthy()
      expect(def.readingJa).toBeTruthy()
      expect(def.nameEn).toBeTruthy()
      expect(def.description).toBeTruthy()
    }
  })
})

describe('findNearestMoonPhase', () => {
  it('phaseDeg=0で朔を返す', () => {
    expect(findNearestMoonPhase(0).nameJa).toBe('朔')
  })

  it('phaseDeg=180で望を返す', () => {
    expect(findNearestMoonPhase(180).nameJa).toBe('望')
  })

  it('phaseDeg=90付近で上弦を返す', () => {
    expect(findNearestMoonPhase(90).nameJa).toBe('上弦')
  })

  it('phaseDeg=270付近で下弦を返す', () => {
    expect(findNearestMoonPhase(270).nameJa).toBe('下弦')
  })

  it('phaseDeg=359で晦または朔を返す', () => {
    const result = findNearestMoonPhase(359)
    expect(['晦', '朔']).toContain(result.nameJa)
  })

  it('負の値でも正しく動作する', () => {
    expect(findNearestMoonPhase(-10).nameJa).toBe('晦')
  })

  it('360超でも正しく動作する', () => {
    expect(findNearestMoonPhase(540).nameJa).toBe('望')
  })
})
