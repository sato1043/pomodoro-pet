/**
 * 月位相テクスチャ生成の純粋関数。
 * Three.js非依存。CanvasテクスチャのピクセルデータをUint8ClampedArrayで返す。
 */

/** 月面の基本色（白〜淡黄） */
const MOON_BASE_R = 240
const MOON_BASE_G = 235
const MOON_BASE_B = 220

/** 月面の暗部色（マリア） */
const MOON_DARK_R = 180
const MOON_DARK_G = 175
const MOON_DARK_B = 160

/**
 * 月の満ち欠けを表すテクスチャピクセルデータを生成する。
 *
 * @param phaseDeg - 月齢角度（0=新月, 90=上弦, 180=満月, 270=下弦）
 * @param size - テクスチャサイズ（正方形、ピクセル）
 * @param illumination - 照度割合（0.0〜1.0）。明るさの係数に使用
 * @returns RGBA形式のピクセルデータ（size × size × 4バイト）
 */
export function generateMoonPhasePixels(
  phaseDeg: number,
  size: number,
  illumination: number
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4)
  const center = size / 2
  const radius = size / 2 - 1

  // phaseDegからterminator位置を算出
  // 0°=新月（全暗）、90°=上弦（右半分明）、180°=満月（全明）、270°=下弦（左半分明）
  const phaseRad = phaseDeg * Math.PI / 180
  // terminatorのx方向cosine: 明暗境界の楕円のx軸比率
  // cos(0)=1（新月: terminator=右端）→ cos(90)=0（上弦: terminator=中央）→ cos(180)=-1（満月: terminator=左端）
  const terminatorCos = Math.cos(phaseRad)

  // 明るさ係数
  const brightness = 0.5 + illumination * 0.5

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - center
      const dy = y - center
      const distSq = dx * dx + dy * dy
      const radiusSq = radius * radius

      if (distSq > radiusSq) {
        // 円の外: 透明
        data[idx] = 0
        data[idx + 1] = 0
        data[idx + 2] = 0
        data[idx + 3] = 0
        continue
      }

      // 球面上のx座標（-1〜+1に正規化）
      const nx = dx / radius
      // 球面上のy座標
      const ny = dy / radius
      // 球面のz座標（視点方向）
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))

      // terminator判定: 球面のx座標とterminatorCosを比較
      // phaseDeg < 180: 右側（nx > 0）が明るい → terminatorCosより右なら明
      // phaseDeg >= 180: 左側（nx < 0）も明るくなる
      let lit: number
      if (phaseDeg <= 180) {
        // 新月→満月: terminatorCosから右が明
        lit = nx > terminatorCos ? 1.0 : 0.0
        // terminatorの近辺をスムーズにする
        const edgeWidth = 0.08
        if (Math.abs(nx - terminatorCos) < edgeWidth) {
          lit = (nx - terminatorCos + edgeWidth) / (edgeWidth * 2)
          lit = Math.max(0, Math.min(1, lit))
        }
      } else {
        // 満月→新月: terminatorCosから左が明
        lit = nx < terminatorCos ? 1.0 : 0.0
        const edgeWidth = 0.08
        if (Math.abs(nx - terminatorCos) < edgeWidth) {
          lit = (terminatorCos - nx + edgeWidth) / (edgeWidth * 2)
          lit = Math.max(0, Math.min(1, lit))
        }
      }

      // 球面のリムライト効果（エッジを暗く）
      const rimDarkening = nz * 0.3 + 0.7

      // 月面のノイズ風バリエーション（簡易的なマリア模様）
      const mariaFactor = Math.sin(nx * 5.0 + ny * 3.0) * 0.3 + 0.7

      const r = (MOON_BASE_R * mariaFactor + MOON_DARK_R * (1 - mariaFactor)) * brightness * rimDarkening * lit
      const g = (MOON_BASE_G * mariaFactor + MOON_DARK_G * (1 - mariaFactor)) * brightness * rimDarkening * lit
      const b = (MOON_BASE_B * mariaFactor + MOON_DARK_B * (1 - mariaFactor)) * brightness * rimDarkening * lit

      // 暗部は完全な黒ではなく微かに可視
      const darkSide = 0.03 * brightness * 255
      data[idx] = Math.min(255, Math.round(Math.max(r, darkSide)))
      data[idx + 1] = Math.min(255, Math.round(Math.max(g, darkSide)))
      data[idx + 2] = Math.min(255, Math.round(Math.max(b, darkSide)))

      // エッジ: ソフトアルファ
      const edgeDist = Math.sqrt(distSq) / radius
      const alpha = edgeDist > 0.9 ? (1 - edgeDist) / 0.1 : 1.0
      data[idx + 3] = Math.round(alpha * 255)
    }
  }

  return data
}
