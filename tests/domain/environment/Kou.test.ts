import { describe, it, expect } from 'vitest'
import { KOU_DEFINITIONS, resolveKou, kouProgress } from '../../../src/domain/environment/value-objects/Kou'

describe('KOU_DEFINITIONS', () => {
  it('全72候が定義されている', () => {
    expect(KOU_DEFINITIONS).toHaveLength(72)
  })

  it('index 0 は小寒初候「芹乃栄」', () => {
    const kou = KOU_DEFINITIONS[0]
    expect(kou.index).toBe(0)
    expect(kou.solarTermName).toBe('小寒')
    expect(kou.phase).toBe('initial')
    expect(kou.nameJa).toBe('芹乃栄')
    expect(kou.eclipticLonStart).toBe(285)
  })

  it('index 6 は立春初候「東風解凍」', () => {
    const kou = KOU_DEFINITIONS[6]
    expect(kou.index).toBe(6)
    expect(kou.solarTermName).toBe('立春')
    expect(kou.phase).toBe('initial')
    expect(kou.nameJa).toBe('東風解凍')
    expect(kou.eclipticLonStart).toBe(315)
  })

  it('index 15 は春分初候で黄経0度始まり', () => {
    const kou = KOU_DEFINITIONS[15]
    expect(kou.solarTermName).toBe('春分')
    expect(kou.phase).toBe('initial')
    expect(kou.nameJa).toBe('雀始巣')
    // (15 * 5 + 285) % 360 = (75 + 285) % 360 = 360 % 360 = 0
    expect(kou.eclipticLonStart).toBe(0)
  })

  it('index 71 は冬至末候「雪下出麦」', () => {
    const kou = KOU_DEFINITIONS[71]
    expect(kou.index).toBe(71)
    expect(kou.solarTermName).toBe('冬至')
    expect(kou.phase).toBe('final')
    expect(kou.nameJa).toBe('雪下出麦')
    // (71 * 5 + 285) % 360 = (355 + 285) % 360 = 640 % 360 = 280
    expect(kou.eclipticLonStart).toBe(280)
  })

  it('各候が3候ずつ24節気に分配されている', () => {
    for (let i = 0; i < 72; i++) {
      const kou = KOU_DEFINITIONS[i]
      const expectedPhase = ['initial', 'middle', 'final'][i % 3]
      expect(kou.phase).toBe(expectedPhase)
      expect(kou.index).toBe(i)
    }
  })

  it('全候にreadingJaとdescriptionが設定されている', () => {
    for (const kou of KOU_DEFINITIONS) {
      expect(kou.readingJa.length).toBeGreaterThan(0)
      expect(kou.description.length).toBeGreaterThan(0)
      expect(kou.nameEn.length).toBeGreaterThan(0)
    }
  })
})

describe('resolveKou', () => {
  it('黄経285度 → index 0（小寒初候）', () => {
    const kou = resolveKou(285)
    expect(kou.index).toBe(0)
    expect(kou.nameJa).toBe('芹乃栄')
  })

  it('黄経0度 → index 15（春分初候）', () => {
    const kou = resolveKou(0)
    expect(kou.index).toBe(15)
  })

  it('黄経90度 → index 33（夏至初候）', () => {
    const kou = resolveKou(90)
    expect(kou.index).toBe(33)
    expect(kou.solarTermName).toBe('夏至')
  })

  it('黄経284.9度 → index 71（冬至末候）', () => {
    const kou = resolveKou(284.9)
    expect(kou.index).toBe(71)
  })

  it('負の黄経を正規化する', () => {
    // -75度 → 285度 → index 0
    const kou = resolveKou(-75)
    expect(kou.index).toBe(0)
  })

  it('360度以上の黄経を正規化する', () => {
    // 360度 → 0度 → index 15
    const kou = resolveKou(360)
    expect(kou.index).toBe(15)
    // 720度 → 0度 → index 15
    const kou2 = resolveKou(720)
    expect(kou2.index).toBe(15)
  })
})

describe('kouProgress', () => {
  it('候の開始点でprogress=0', () => {
    const { kou, progress } = kouProgress(285)
    expect(kou.index).toBe(0)
    expect(progress).toBeCloseTo(0, 5)
  })

  it('候の中間点でprogress≒0.5', () => {
    // 285 + 2.5 = 287.5 → index 0, progress = 2.5/5 = 0.5
    const { kou, progress } = kouProgress(287.5)
    expect(kou.index).toBe(0)
    expect(progress).toBeCloseTo(0.5, 5)
  })

  it('候の終了直前でprogress≒1.0', () => {
    // 285 + 4.99 = 289.99 → index 0, progress ≒ 0.998
    const { kou, progress } = kouProgress(289.99)
    expect(kou.index).toBe(0)
    expect(progress).toBeGreaterThan(0.99)
    expect(progress).toBeLessThan(1.0)
  })

  it('春分点付近で正しく計算される', () => {
    const { kou, progress } = kouProgress(2.5)
    expect(kou.index).toBe(15)
    expect(progress).toBeCloseTo(0.5, 5)
  })
})
