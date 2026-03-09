/** 太陽位置の計算結果 */
export interface SolarPosition {
  readonly altitude: number     // 高度角 (度, -90〜+90。正=地平線上、負=地平線下)
  readonly azimuth: number      // 方位角 (度, 0〜360。北=0, 東=90, 南=180, 西=270)
  readonly eclipticLon: number  // 黄経 (度, 0〜360。春分点=0)
}

/** 月位置の計算結果 */
export interface LunarPosition {
  readonly altitude: number              // 高度角 (度, -90〜+90)
  readonly azimuth: number               // 方位角 (度, 0〜360)
  readonly phaseDeg: number              // 月齢角度 (0=新月, 90=上弦, 180=満月, 270=下弦)
  readonly illuminationFraction: number  // 照度割合 (0.0=新月, 1.0=満月)
  readonly isAboveHorizon: boolean       // 地平線上にあるか
}

/** 天文計算のポートインターフェース（ドメイン層で定義、インフラ層で実装） */
export interface AstronomyPort {
  /** 指定日時・緯度経度での太陽位置を返す */
  getSolarPosition(date: Date, latitude: number, longitude: number): SolarPosition

  /** 指定日時・緯度経度での月位置を返す */
  getLunarPosition(date: Date, latitude: number, longitude: number): LunarPosition

  /** 太陽黄経が指定値に達する日時を探索する（候の境界日時の計算用） */
  searchSunLongitude(targetLon: number, startDate: Date, limitDays: number): Date | null
}
