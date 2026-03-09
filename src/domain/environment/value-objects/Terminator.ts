/**
 * terminator（昼夜分界線）のSVG座標多角形を計算する純粋関数。
 * 太陽の赤緯・グリニッジ時角から等距円筒図法のSVG polygon points文字列を生成する。
 */
export function computeTerminatorPolygon(declination: number, gha: number): string {
  // 太陽直下点: latitude=declination, longitude=-gha
  const subLon = ((-gha + 180 + 360) % 360) - 180

  const points: string[] = []
  const DEG = Math.PI / 180

  // terminatorを計算: 太陽高度=0のライン
  // cos(zenith) = sin(lat)*sin(dec) + cos(lat)*cos(dec)*cos(dlon)
  // zenith=90° (altitude=0) → tan(lat) = -cos(dlon)*cos(dec)/sin(dec)
  // 注意: atan2ではなくatanを使う。atan2はsin(dec)<0のとき2/3象限に入り
  // 緯度が[-90,90]外になるため、clampで誤った値になる。
  const decRad = declination * DEG
  const sinDec = Math.sin(decRad)
  const cosDec = Math.cos(decRad)

  for (let lon = -180; lon <= 180; lon += 2) {
    const dlon = (lon - subLon) * DEG
    const cosDlon = Math.cos(dlon)

    let lat: number
    if (Math.abs(sinDec) < 1e-10) {
      // 春分/秋分: terminatorは両極を通る大円
      lat = cosDlon > 1e-10 ? -90 : cosDlon < -1e-10 ? 90 : 0
    } else {
      lat = Math.atan(-cosDlon * cosDec / sinDec) / DEG
    }

    const clampedLat = Math.max(-90, Math.min(90, lat))
    points.push(`${lon},${-clampedLat}`)
  }

  // 夜側を閉じる: 北極or南極側
  // 太陽赤緯が正(北半球夏)→北極は常時昼→南側が夜
  if (declination >= 0) {
    points.push('180,90')
    points.push('-180,90')
  } else {
    points.push('180,-90')
    points.push('-180,-90')
  }

  return points.join(' ')
}
