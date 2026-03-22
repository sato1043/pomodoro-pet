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
 * @param rotationRad - テクスチャ回転角（ラジアン）。moonSunAngleに基づき明暗境界を回転。
 *                      0=太陽が上、π/2=太陽が右、-π/2=太陽が左
 * @param darkTintRGB - 暗部のティント色 [R, G, B]（0-255）。日中は空色を渡すことで暗部が空に馴染む
 * @returns RGBA形式のピクセルデータ（size × size × 4バイト）
 */
export function generateMoonPhasePixels(
  phaseDeg: number,
  size: number,
  illumination: number,
  rotationRad: number = 0,
  darkTintRGB: readonly [number, number, number] = [0, 0, 0]
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(size * size * 4)
  const center = size / 2
  const radius = size / 2 - 1

  // 球面terminator: rnx * sin(phase) - nz * cos(phase) > 0 で全フェーズに対応
  // 0°=新月（全暗）、90°=上弦（右半分明）、180°=満月（全明）、270°=下弦（左半分明）
  const phaseRad = phaseDeg * Math.PI / 180
  const sinPhase = Math.sin(phaseRad)
  const cosPhase = Math.cos(phaseRad)

  // 明るさ係数
  const brightness = 0.5 + illumination * 0.5

  // 明暗境界の回転（太陽方向に合わせる）
  const cosR = Math.cos(rotationRad)
  const sinR = Math.sin(rotationRad)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4
      const dx = x - center
      const dy = y - center
      const distSq = dx * dx + dy * dy
      const radiusSq = radius * radius

      if (distSq > radiusSq) {
        // 円の外: 透明（RGBは月面色を維持しバイリニアフィルタリングの色にじみを防止）
        data[idx] = MOON_BASE_R
        data[idx + 1] = MOON_BASE_G
        data[idx + 2] = MOON_BASE_B
        data[idx + 3] = 0
        continue
      }

      // 球面上のx座標（-1〜+1に正規化）
      const nx = dx / radius
      // 球面上のy座標
      const ny = dy / radius
      // 球面のz座標（視点方向）
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))

      // 回転済み座標: 明暗境界を太陽方向に合わせる
      const rnx = nx * cosR - ny * sinR

      // 球面terminator判定: 3D球面座標で明暗境界を計算（楕円形のterminator）
      // rnx * sin(phase) - nz * cos(phase) > 0 → lit
      // この式は全フェーズ（0°〜360°）で正しく動作する
      const terminatorValue = rnx * sinPhase - nz * cosPhase
      let lit: number
      const edgeWidth = 0.06
      if (terminatorValue > edgeWidth) {
        lit = 1.0
      } else if (terminatorValue < -edgeWidth) {
        lit = 0.0
      } else {
        lit = (terminatorValue + edgeWidth) / (edgeWidth * 2)
      }

      // 球面のリムライト効果（エッジを暗く）
      const rimDarkening = nz * 0.3 + 0.7

      // 月面のノイズ風バリエーション（簡易的なマリア模様）
      const mariaFactor = Math.sin(nx * 5.0 + ny * 3.0) * 0.3 + 0.7

      // 地球照（earthshine）: 三日月ほど暗部が明るく見える
      const earthshine = (1 - lit) * 0.12 * (1 - illumination + 0.3) * rimDarkening
      const litValue = lit * brightness * rimDarkening + earthshine

      const baseR = MOON_BASE_R * mariaFactor + MOON_DARK_R * (1 - mariaFactor)
      const baseG = MOON_BASE_G * mariaFactor + MOON_DARK_G * (1 - mariaFactor)
      const baseB = MOON_BASE_B * mariaFactor + MOON_DARK_B * (1 - mariaFactor)

      const r = baseR * litValue
      const g = baseG * litValue
      const b = baseB * litValue

      // 暗部の最低輝度（darkTintRGBとブレンド: 日中は空色に寄せる）
      const tintBlend = 0.65
      const darkR = darkTintRGB[0] * tintBlend + 0.05 * 255 * (1 - tintBlend)
      const darkG = darkTintRGB[1] * tintBlend + 0.05 * 255 * (1 - tintBlend)
      const darkB = darkTintRGB[2] * tintBlend + 0.05 * 255 * (1 - tintBlend)
      data[idx] = Math.min(255, Math.round(Math.max(r, darkR)))
      data[idx + 1] = Math.min(255, Math.round(Math.max(g, darkG)))
      data[idx + 2] = Math.min(255, Math.round(Math.max(b, darkB)))

      // エッジ: ソフトアルファ
      const edgeDist = Math.sqrt(distSq) / radius
      const alpha = edgeDist > 0.9 ? (1 - edgeDist) / 0.1 : 1.0
      data[idx + 3] = Math.round(alpha * 255)
    }
  }

  return data
}
