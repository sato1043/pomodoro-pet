/**
 * 月齢の伝統的呼称定義。
 * 旧暦の月齢（新月からの日数）に基づく日本語名と、対応する離角（phaseDeg）・照度を持つ。
 * 月齢1日 ≈ 12.2°（360° ÷ 29.5日）。
 */

export interface MoonPhaseDefinition {
  /** 配列インデックス */
  readonly index: number
  /** 旧暦の月齢（日） */
  readonly lunarDay: number
  /** 離角（度）: 0=新月, 90=上弦, 180=満月, 270=下弦 */
  readonly phaseDeg: number
  /** 照度割合（0.0〜1.0） */
  readonly illumination: number
  /** 日本語名 */
  readonly nameJa: string
  /** 読み */
  readonly readingJa: string
  /** 英語名 */
  readonly nameEn: string
  /** 説明 */
  readonly description: string
}

/**
 * 月齢の伝統的呼称一覧。
 * phaseDeg = lunarDay * (360 / 29.5) を基準に丸め。
 * illumination = (1 - cos(phaseDeg * π / 180)) / 2 で近似。
 */
export const MOON_PHASE_DEFINITIONS: readonly MoonPhaseDefinition[] = [
  {
    index: 0, lunarDay: 0, phaseDeg: 0, illumination: 0.00,
    nameJa: '朔', readingJa: 'さく', nameEn: 'New Moon',
    description: '月が太陽と同じ方向にあり見えない',
  },
  {
    index: 1, lunarDay: 2, phaseDeg: 24, illumination: 0.04,
    nameJa: '繊月', readingJa: 'せんげつ', nameEn: 'Young Crescent',
    description: '糸のように細い月',
  },
  {
    index: 2, lunarDay: 3, phaseDeg: 37, illumination: 0.10,
    nameJa: '三日月', readingJa: 'みかづき', nameEn: 'Waxing Crescent',
    description: '細い弓形の月',
  },
  {
    index: 3, lunarDay: 7, phaseDeg: 85, illumination: 0.49,
    nameJa: '上弦', readingJa: 'じょうげん', nameEn: 'First Quarter',
    description: '右半分が明るい半月',
  },
  {
    index: 4, lunarDay: 10, phaseDeg: 122, illumination: 0.74,
    nameJa: '十日夜月', readingJa: 'とおかんやづき', nameEn: 'Waxing Gibbous',
    description: '満月に向かって膨らむ月',
  },
  {
    index: 5, lunarDay: 13, phaseDeg: 159, illumination: 0.93,
    nameJa: '十三夜月', readingJa: 'じゅうさんやづき', nameEn: 'Waxing Gibbous',
    description: '満月に近い丸い月。十三夜の月見',
  },
  {
    index: 6, lunarDay: 14, phaseDeg: 171, illumination: 0.98,
    nameJa: '小望月', readingJa: 'こもちづき', nameEn: 'Nearly Full',
    description: '満月の前夜の月',
  },
  {
    index: 7, lunarDay: 15, phaseDeg: 180, illumination: 1.00,
    nameJa: '望', readingJa: 'もち', nameEn: 'Full Moon',
    description: '太陽の反対側で全面が明るい満月',
  },
  {
    index: 8, lunarDay: 16, phaseDeg: 195, illumination: 0.97,
    nameJa: '十六夜', readingJa: 'いざよい', nameEn: 'Sixteen Night',
    description: '満月の翌夜。ためらうように遅れて昇る',
  },
  {
    index: 9, lunarDay: 17, phaseDeg: 207, illumination: 0.92,
    nameJa: '立待月', readingJa: 'たちまちづき', nameEn: 'Standing Wait',
    description: '立って待つうちに昇る月',
  },
  {
    index: 10, lunarDay: 18, phaseDeg: 220, illumination: 0.85,
    nameJa: '居待月', readingJa: 'いまちづき', nameEn: 'Sitting Wait',
    description: '座って待つうちに昇る月',
  },
  {
    index: 11, lunarDay: 19, phaseDeg: 232, illumination: 0.77,
    nameJa: '寝待月', readingJa: 'ねまちづき', nameEn: 'Lying Wait',
    description: '寝て待つうちに昇る月',
  },
  {
    index: 12, lunarDay: 20, phaseDeg: 244, illumination: 0.68,
    nameJa: '更待月', readingJa: 'ふけまちづき', nameEn: 'Late Night Wait',
    description: '夜更けまで待ってようやく昇る月',
  },
  {
    index: 13, lunarDay: 23, phaseDeg: 280, illumination: 0.47,
    nameJa: '下弦', readingJa: 'かげん', nameEn: 'Last Quarter',
    description: '左半分が明るい半月',
  },
  {
    index: 14, lunarDay: 26, phaseDeg: 317, illumination: 0.18,
    nameJa: '有明月', readingJa: 'ありあけづき', nameEn: 'Dawn Moon',
    description: '夜明けの空に残る細い月',
  },
  {
    index: 15, lunarDay: 30, phaseDeg: 356, illumination: 0.00,
    nameJa: '晦', readingJa: 'つごもり', nameEn: 'Dark Moon',
    description: '月が隠れる。月籠りが語源',
  },
]

/** phaseDegから最も近いMoonPhaseDefinitionを返す */
export function findNearestMoonPhase(phaseDeg: number): MoonPhaseDefinition {
  const normalized = ((phaseDeg % 360) + 360) % 360
  let nearest = MOON_PHASE_DEFINITIONS[0]
  let minDist = 360
  for (const def of MOON_PHASE_DEFINITIONS) {
    const dist = Math.min(
      Math.abs(normalized - def.phaseDeg),
      360 - Math.abs(normalized - def.phaseDeg)
    )
    if (dist < minDist) {
      minDist = dist
      nearest = def
    }
  }
  return nearest
}
