import {
  Body,
  Equator,
  Horizon,
  Illumination,
  MakeTime,
  MoonPhase,
  Observer,
  SearchSunLongitude,
  SiderealTime,
  SunPosition,
} from 'astronomy-engine'
import type { AstronomyPort, LunarPosition, SolarPosition } from '../../domain/environment/value-objects/SolarPosition'

export function createAstronomyAdapter(): AstronomyPort {
  return {
    getSolarPosition(date: Date, latitude: number, longitude: number): SolarPosition {
      const time = MakeTime(date)
      const observer = new Observer(latitude, longitude, 0)
      const sunEq = Equator(Body.Sun, time, observer, true, true)
      const sunHor = Horizon(time, observer, sunEq.ra, sunEq.dec, 'normal')
      const ecl = SunPosition(time)
      return { altitude: sunHor.altitude, azimuth: sunHor.azimuth, eclipticLon: ecl.elon }
    },

    getLunarPosition(date: Date, latitude: number, longitude: number): LunarPosition {
      const time = MakeTime(date)
      const observer = new Observer(latitude, longitude, 0)
      const moonEq = Equator(Body.Moon, time, observer, true, true)
      const moonHor = Horizon(time, observer, moonEq.ra, moonEq.dec, 'normal')
      const phaseDeg = MoonPhase(time)
      const illum = Illumination(Body.Moon, time)
      return {
        altitude: moonHor.altitude,
        azimuth: moonHor.azimuth,
        phaseDeg,
        illuminationFraction: illum.phase_fraction,
        isAboveHorizon: moonHor.altitude > 0,
      }
    },

    searchSunLongitude(targetLon: number, startDate: Date, limitDays: number): Date | null {
      const time = MakeTime(startDate)
      const result = SearchSunLongitude(targetLon, time, limitDays)
      return result ? result.date : null
    },
  }
}

/** 太陽赤緯とグリニッジ時角を返す（terminator計算用、UI専用ヘルパー） */
export function getSolarDeclinationAndGHA(date: Date): { declination: number; gha: number } {
  const time = MakeTime(date)
  const observer = new Observer(0, 0, 0)
  const sunEq = Equator(Body.Sun, time, observer, true, true)

  const declination = sunEq.dec
  const gst = SiderealTime(time)
  const gha = ((gst - sunEq.ra) * 15 + 360) % 360

  return { declination, gha }
}
