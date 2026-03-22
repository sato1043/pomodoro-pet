export interface EnvironmentThemeParams {
  readonly skyColor: number
  readonly fogColor: number
  readonly fogNear: number
  readonly fogFar: number
  readonly ambientColor: number
  readonly ambientIntensity: number
  readonly hemiSkyColor: number
  readonly hemiGroundColor: number
  readonly hemiIntensity: number
  readonly sunColor: number
  readonly sunIntensity: number
  readonly sunPosition: { readonly x: number; readonly y: number; readonly z: number }
  readonly groundColor: number
  readonly exposure: number
  readonly moonPosition: { readonly x: number; readonly y: number; readonly z: number }
  readonly moonPhaseDeg: number          // 0=新月, 180=満月
  readonly moonIllumination: number      // 0.0〜1.0
  readonly moonIsVisible: boolean
  readonly moonOpacity: number           // 0.0〜1.0（水平線フェード × 天気減衰）
  readonly moonSunAngle: number          // 月テクスチャ回転角（ラジアン）。シーン座標系での太陽→月方向
}

/** 色を白方向にlerp（明度を上げる） */
export function lightenColor(hex: number, factor: number): number {
  const r = (hex >> 16) & 0xff
  const g = (hex >> 8) & 0xff
  const b = hex & 0xff
  const lr = Math.min(255, Math.round(r + (255 - r) * factor))
  const lg = Math.min(255, Math.round(g + (255 - g) * factor))
  const lb = Math.min(255, Math.round(b + (255 - b) * factor))
  return (lr << 16) | (lg << 8) | lb
}
