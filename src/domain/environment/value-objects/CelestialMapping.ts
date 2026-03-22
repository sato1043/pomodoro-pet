/**
 * 天球座標系 — Three.jsシーン座標系とは独立した仮想座標系。
 * 天文データ（azimuth/altitude）を天球上に配置し、
 * CelestialMappingで回転・圧縮してシーン座標に変換する。
 */

/** 天球上の座標（天文学的な方位・仰角） */
export interface CelestialCoordinate {
  readonly azimuth: number   // 0=北, 90=東, 180=南, 270=西（度）
  readonly altitude: number  // -90〜+90（度）
}

/**
 * 天球→シーン座標のマッピング設定。
 * viewDirectionで天球のどの方位がカメラ正面（-z）に来るかを指定。
 * azimuthCompressionで天球の方位範囲を画面幅に収まるよう圧縮。
 */
export interface CelestialMapping {
  readonly viewDirection: number       // カメラが見ている天球方位（度）。180=南向き
  readonly azimuthCompression: number  // 方位圧縮率。0.5=180°→90°に圧縮
}

/**
 * デフォルトマッピング:
 * - viewDirection=180: カメラは天球の南を向く（北半球で太陽が見える方向）
 * - azimuthCompression=0.5: 東→西の180°を90°に圧縮（カメラFOV内に収まる）
 */
export const DEFAULT_CELESTIAL_MAPPING: CelestialMapping = {
  viewDirection: 180,
  azimuthCompression: 0.5,
}

/**
 * 天球座標をシーン座標の単位方向ベクトルに変換する。
 *
 * シーン座標系:
 *   -z = カメラ正面（天球のviewDirection方位）
 *   +x = 画面右
 *   +y = 画面上
 *
 * キャラクター進行方向は+z（天球の北）。
 */
export function celestialToScene(
  coord: CelestialCoordinate,
  mapping: CelestialMapping
): { x: number; y: number; z: number } {
  const sceneAzDeg = (coord.azimuth - mapping.viewDirection) * mapping.azimuthCompression
  const altRad = coord.altitude * Math.PI / 180
  const azRad = sceneAzDeg * Math.PI / 180
  return {
    x: -Math.cos(altRad) * Math.sin(azRad),
    y: Math.sin(altRad),
    z: -Math.cos(altRad) * Math.cos(azRad),
  }
}

/**
 * シーン座標系での太陽→月ベクトルから、月テクスチャの回転角を算出する。
 * 返り値はラジアン。0=太陽が月の上、π/2=太陽が月の右、-π/2=太陽が月の左。
 *
 * カメラは-z方向を向くため、スクリーン座標はx=水平、y=垂直に対応する。
 */
export function computeMoonSunAngle(
  sunScreen: { x: number; y: number },
  moonScreen: { x: number; y: number }
): number {
  const dx = sunScreen.x - moonScreen.x
  const dy = sunScreen.y - moonScreen.y
  return Math.atan2(dx, dy)
}
