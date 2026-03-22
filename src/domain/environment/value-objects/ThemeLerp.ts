import type { EnvironmentThemeParams } from './EnvironmentTheme'

// --- 型定義 ---

export interface ThemeTransitionState {
  readonly from: EnvironmentThemeParams
  readonly to: EnvironmentThemeParams
  readonly elapsedMs: number
  readonly durationMs: number
}

export type ThemeTransitionResult =
  | { readonly status: 'transitioning'; readonly params: EnvironmentThemeParams; readonly state: ThemeTransitionState }
  | { readonly status: 'completed'; readonly params: EnvironmentThemeParams }

// --- 定数 ---

export const THEME_TRANSITION_DURATION_AUTO_MS = 5000
export const THEME_TRANSITION_DURATION_MANUAL_MS = 1500

// --- 純粋関数 ---

export function lerpFloat(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

export function lerpHexColor(from: number, to: number, t: number): number {
  const fromR = (from >> 16) & 0xff
  const fromG = (from >> 8) & 0xff
  const fromB = from & 0xff
  const toR = (to >> 16) & 0xff
  const toG = (to >> 8) & 0xff
  const toB = to & 0xff
  const r = Math.round(fromR + (toR - fromR) * t)
  const g = Math.round(fromG + (toG - fromG) * t)
  const b = Math.round(fromB + (toB - fromB) * t)
  return (r << 16) | (g << 8) | b
}

export function lerpVec3(
  from: { readonly x: number; readonly y: number; readonly z: number },
  to: { readonly x: number; readonly y: number; readonly z: number },
  t: number
): { readonly x: number; readonly y: number; readonly z: number } {
  return {
    x: lerpFloat(from.x, to.x, t),
    y: lerpFloat(from.y, to.y, t),
    z: lerpFloat(from.z, to.z, t),
  }
}

export function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

export function lerpThemeParams(
  from: EnvironmentThemeParams,
  to: EnvironmentThemeParams,
  t: number
): EnvironmentThemeParams {
  return {
    skyColor: lerpHexColor(from.skyColor, to.skyColor, t),
    fogColor: lerpHexColor(from.fogColor, to.fogColor, t),
    fogNear: lerpFloat(from.fogNear, to.fogNear, t),
    fogFar: lerpFloat(from.fogFar, to.fogFar, t),
    ambientColor: lerpHexColor(from.ambientColor, to.ambientColor, t),
    ambientIntensity: lerpFloat(from.ambientIntensity, to.ambientIntensity, t),
    hemiSkyColor: lerpHexColor(from.hemiSkyColor, to.hemiSkyColor, t),
    hemiGroundColor: lerpHexColor(from.hemiGroundColor, to.hemiGroundColor, t),
    hemiIntensity: lerpFloat(from.hemiIntensity, to.hemiIntensity, t),
    sunColor: lerpHexColor(from.sunColor, to.sunColor, t),
    sunIntensity: lerpFloat(from.sunIntensity, to.sunIntensity, t),
    sunPosition: lerpVec3(from.sunPosition, to.sunPosition, t),
    groundColor: lerpHexColor(from.groundColor, to.groundColor, t),
    exposure: lerpFloat(from.exposure, to.exposure, t),
    moonPosition: lerpVec3(from.moonPosition, to.moonPosition, t),
    moonPhaseDeg: lerpFloat(from.moonPhaseDeg, to.moonPhaseDeg, t),
    moonIllumination: lerpFloat(from.moonIllumination, to.moonIllumination, t),
    moonIsVisible: t < 0.5 ? from.moonIsVisible : to.moonIsVisible,
    moonOpacity: lerpFloat(from.moonOpacity, to.moonOpacity, t),
    moonSunAngle: lerpFloat(from.moonSunAngle, to.moonSunAngle, t),
  }
}

export function themeParamsEqual(a: EnvironmentThemeParams, b: EnvironmentThemeParams): boolean {
  return (
    a.skyColor === b.skyColor &&
    a.fogColor === b.fogColor &&
    a.fogNear === b.fogNear &&
    a.fogFar === b.fogFar &&
    a.ambientColor === b.ambientColor &&
    a.ambientIntensity === b.ambientIntensity &&
    a.hemiSkyColor === b.hemiSkyColor &&
    a.hemiGroundColor === b.hemiGroundColor &&
    a.hemiIntensity === b.hemiIntensity &&
    a.sunColor === b.sunColor &&
    a.sunIntensity === b.sunIntensity &&
    a.sunPosition.x === b.sunPosition.x &&
    a.sunPosition.y === b.sunPosition.y &&
    a.sunPosition.z === b.sunPosition.z &&
    a.groundColor === b.groundColor &&
    a.exposure === b.exposure &&
    a.moonPosition.x === b.moonPosition.x &&
    a.moonPosition.y === b.moonPosition.y &&
    a.moonPosition.z === b.moonPosition.z &&
    a.moonPhaseDeg === b.moonPhaseDeg &&
    a.moonIllumination === b.moonIllumination &&
    a.moonIsVisible === b.moonIsVisible &&
    a.moonOpacity === b.moonOpacity &&
    a.moonSunAngle === b.moonSunAngle
  )
}

export function startThemeTransition(
  from: EnvironmentThemeParams,
  to: EnvironmentThemeParams,
  durationMs: number
): ThemeTransitionState {
  return { from, to, elapsedMs: 0, durationMs }
}

export function tickThemeTransition(
  state: ThemeTransitionState,
  deltaMs: number
): ThemeTransitionResult {
  const elapsed = state.elapsedMs + deltaMs
  if (elapsed >= state.durationMs) {
    return { status: 'completed', params: state.to }
  }
  const rawT = elapsed / state.durationMs
  const t = smoothstep(rawT)
  const params = lerpThemeParams(state.from, state.to, t)
  return {
    status: 'transitioning',
    params,
    state: { ...state, elapsedMs: elapsed },
  }
}
