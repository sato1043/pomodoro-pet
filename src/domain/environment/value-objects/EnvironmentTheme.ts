import type { WeatherType, TimeOfDay } from './WeatherConfig'
import type { ScenePresetName } from './ScenePreset'

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
}

type ThemeKey = `${WeatherType}-${TimeOfDay}`

const THEME_TABLE: Record<string, EnvironmentThemeParams> = {
  // --- sunny ---
  'sunny-morning': {
    skyColor: 0xffc9a8,
    fogColor: 0xffe0c0,
    fogNear: 15,
    fogFar: 35,
    ambientColor: 0xffeedd,
    ambientIntensity: 0.6,
    hemiSkyColor: 0xffc9a8,
    hemiGroundColor: 0x5d8a3c,
    hemiIntensity: 0.6,
    sunColor: 0xffcc88,
    sunIntensity: 1.0,
    sunPosition: { x: 4, y: 8, z: 5 },
    groundColor: 0x5d8a3c,
    exposure: 1.0,
  },
  'sunny-day': {
    skyColor: 0x87ceeb,
    fogColor: 0xc8e6f0,
    fogNear: 15,
    fogFar: 35,
    ambientColor: 0xffeedd,
    ambientIntensity: 0.8,
    hemiSkyColor: 0x87ceeb,
    hemiGroundColor: 0x5d8a3c,
    hemiIntensity: 0.6,
    sunColor: 0xfff5e0,
    sunIntensity: 1.2,
    sunPosition: { x: 8, y: 12, z: 5 },
    groundColor: 0x5d8a3c,
    exposure: 1.2,
  },
  'sunny-evening': {
    skyColor: 0xff8844,
    fogColor: 0xffaa66,
    fogNear: 12,
    fogFar: 30,
    ambientColor: 0xffaa66,
    ambientIntensity: 0.5,
    hemiSkyColor: 0xff8844,
    hemiGroundColor: 0x5d7a2c,
    hemiIntensity: 0.5,
    sunColor: 0xff6622,
    sunIntensity: 0.8,
    sunPosition: { x: 10, y: 4, z: 5 },
    groundColor: 0x5d7a2c,
    exposure: 0.9,
  },
  'sunny-night': {
    skyColor: 0x0a0e2a,
    fogColor: 0x101838,
    fogNear: 10,
    fogFar: 28,
    ambientColor: 0x5577bb,
    ambientIntensity: 0.9,
    hemiSkyColor: 0x384868,
    hemiGroundColor: 0x2a3a1c,
    hemiIntensity: 0.7,
    sunColor: 0xddeeff,
    sunIntensity: 1.2,
    sunPosition: { x: -6, y: 10, z: -3 },
    groundColor: 0x2a3a1c,
    exposure: 1.2,
  },

  // --- cloudy ---
  'cloudy-morning': {
    skyColor: 0x80a8e0,
    fogColor: 0x90b4e0,
    fogNear: 12,
    fogFar: 30,
    ambientColor: 0xccccdd,
    ambientIntensity: 0.7,
    hemiSkyColor: 0x80a8e0,
    hemiGroundColor: 0x5a8538,
    hemiIntensity: 0.55,
    sunColor: 0xddddee,
    sunIntensity: 0.7,
    sunPosition: { x: 4, y: 8, z: 5 },
    groundColor: 0x5a8538,
    exposure: 1.0,
  },
  'cloudy-day': {
    skyColor: 0x6898e0,
    fogColor: 0x80a8e0,
    fogNear: 12,
    fogFar: 30,
    ambientColor: 0xbbbbcc,
    ambientIntensity: 0.8,
    hemiSkyColor: 0x6898e0,
    hemiGroundColor: 0x588038,
    hemiIntensity: 0.55,
    sunColor: 0xccccdd,
    sunIntensity: 0.8,
    sunPosition: { x: 8, y: 12, z: 5 },
    groundColor: 0x588038,
    exposure: 1.05,
  },
  'cloudy-evening': {
    skyColor: 0x5068b0,
    fogColor: 0x6078b8,
    fogNear: 10,
    fogFar: 26,
    ambientColor: 0x998888,
    ambientIntensity: 0.55,
    hemiSkyColor: 0x5068b0,
    hemiGroundColor: 0x4a7028,
    hemiIntensity: 0.45,
    sunColor: 0xcc9966,
    sunIntensity: 0.6,
    sunPosition: { x: 10, y: 4, z: 5 },
    groundColor: 0x4a7028,
    exposure: 0.9,
  },
  'cloudy-night': {
    skyColor: 0x081848,
    fogColor: 0x102040,
    fogNear: 8,
    fogFar: 24,
    ambientColor: 0x5577bb,
    ambientIntensity: 0.85,
    hemiSkyColor: 0x304060,
    hemiGroundColor: 0x2a3a1c,
    hemiIntensity: 0.65,
    sunColor: 0xccddee,
    sunIntensity: 1.0,
    sunPosition: { x: -6, y: 10, z: -3 },
    groundColor: 0x2a3a1c,
    exposure: 1.1,
  },

  // --- rainy ---
  'rainy-morning': {
    skyColor: 0x7098c8,
    fogColor: 0x80a4cc,
    fogNear: 10,
    fogFar: 25,
    ambientColor: 0x99aabb,
    ambientIntensity: 0.8,
    hemiSkyColor: 0x7098c8,
    hemiGroundColor: 0x588038,
    hemiIntensity: 0.6,
    sunColor: 0xaabbcc,
    sunIntensity: 0.85,
    sunPosition: { x: 4, y: 8, z: 5 },
    groundColor: 0x588038,
    exposure: 1.1,
  },
  'rainy-day': {
    skyColor: 0x5888b8,
    fogColor: 0x6898c0,
    fogNear: 10,
    fogFar: 25,
    ambientColor: 0x8899aa,
    ambientIntensity: 0.85,
    hemiSkyColor: 0x5888b8,
    hemiGroundColor: 0x558038,
    hemiIntensity: 0.6,
    sunColor: 0x99aacc,
    sunIntensity: 1.0,
    sunPosition: { x: 8, y: 12, z: 5 },
    groundColor: 0x558038,
    exposure: 1.1,
  },
  'rainy-evening': {
    skyColor: 0x385898,
    fogColor: 0x4868a0,
    fogNear: 8,
    fogFar: 22,
    ambientColor: 0x665577,
    ambientIntensity: 0.6,
    hemiSkyColor: 0x385898,
    hemiGroundColor: 0x4a7028,
    hemiIntensity: 0.5,
    sunColor: 0x776688,
    sunIntensity: 0.65,
    sunPosition: { x: 10, y: 4, z: 5 },
    groundColor: 0x4a7028,
    exposure: 0.95,
  },
  'rainy-night': {
    skyColor: 0x061438,
    fogColor: 0x0a1c40,
    fogNear: 8,
    fogFar: 20,
    ambientColor: 0x446699,
    ambientIntensity: 0.85,
    hemiSkyColor: 0x304060,
    hemiGroundColor: 0x283818,
    hemiIntensity: 0.65,
    sunColor: 0xccddee,
    sunIntensity: 1.0,
    sunPosition: { x: -6, y: 10, z: -3 },
    groundColor: 0x283818,
    exposure: 1.1,
  },

  // --- snowy ---
  'snowy-morning': {
    skyColor: 0x90b8f0,
    fogColor: 0xa8c4f0,
    fogNear: 8,
    fogFar: 22,
    ambientColor: 0xccddee,
    ambientIntensity: 0.6,
    hemiSkyColor: 0x90b8f0,
    hemiGroundColor: 0xc8c8d0,
    hemiIntensity: 0.5,
    sunColor: 0xddeeff,
    sunIntensity: 0.5,
    sunPosition: { x: 4, y: 8, z: 5 },
    groundColor: 0xc8c8d0,
    exposure: 0.9,
  },
  'snowy-day': {
    skyColor: 0x78a8e8,
    fogColor: 0x90b4e8,
    fogNear: 8,
    fogFar: 22,
    ambientColor: 0xbbccdd,
    ambientIntensity: 0.7,
    hemiSkyColor: 0x78a8e8,
    hemiGroundColor: 0xc0c0c8,
    hemiIntensity: 0.5,
    sunColor: 0xccddef,
    sunIntensity: 0.6,
    sunPosition: { x: 8, y: 12, z: 5 },
    groundColor: 0xc0c0c8,
    exposure: 0.9,
  },
  'snowy-evening': {
    skyColor: 0x5068b0,
    fogColor: 0x6078b8,
    fogNear: 6,
    fogFar: 20,
    ambientColor: 0x8899aa,
    ambientIntensity: 0.4,
    hemiSkyColor: 0x5068b0,
    hemiGroundColor: 0xa0a0b0,
    hemiIntensity: 0.35,
    sunColor: 0x9999bb,
    sunIntensity: 0.35,
    sunPosition: { x: 10, y: 4, z: 5 },
    groundColor: 0xa0a0b0,
    exposure: 0.75,
  },
  'snowy-night': {
    skyColor: 0x081848,
    fogColor: 0x102050,
    fogNear: 6,
    fogFar: 18,
    ambientColor: 0x5577bb,
    ambientIntensity: 0.85,
    hemiSkyColor: 0x384868,
    hemiGroundColor: 0x606878,
    hemiIntensity: 0.65,
    sunColor: 0xddeeff,
    sunIntensity: 1.1,
    sunPosition: { x: -6, y: 10, z: -3 },
    groundColor: 0x606878,
    exposure: 1.15,
  },
}

// --- シーンプリセット別 地面色オーバーライド ---

const SEASIDE_GROUND: Record<string, number> = {
  'sunny-morning':  0xd4b878,
  'sunny-day':      0xd4b878,
  'sunny-evening':  0xc0a870,
  'sunny-night':    0x5c5038,
  'cloudy-morning': 0xccb078,
  'cloudy-day':     0xc8ac70,
  'cloudy-evening': 0xa89460,
  'cloudy-night':   0x5c5038,
  'rainy-morning':  0xc0a870,
  'rainy-day':      0xc4a870,
  'rainy-evening':  0xa89460,
  'rainy-night':    0x584c30,
  'snowy-morning':  0xd0c8b8,
  'snowy-day':      0xc8c0b0,
  'snowy-evening':  0xa89880,
  'snowy-night':    0x686050,
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

export function resolveEnvironmentTheme(
  weather: WeatherType,
  timeOfDay: TimeOfDay,
  presetName?: ScenePresetName
): EnvironmentThemeParams {
  const key: ThemeKey = `${weather}-${timeOfDay}`
  const params = THEME_TABLE[key]
  if (!params) {
    return THEME_TABLE['sunny-day']
  }
  if (presetName === 'seaside') {
    const sandColor = SEASIDE_GROUND[key] ?? params.groundColor
    return {
      ...params,
      skyColor: lightenColor(params.skyColor, 0.25),
      fogColor: lightenColor(params.fogColor, 0.25),
      hemiSkyColor: lightenColor(params.hemiSkyColor, 0.25),
      groundColor: sandColor,
      hemiGroundColor: sandColor,
      exposure: params.exposure * 1.25,
      sunIntensity: params.sunIntensity * 1.2,
      ambientIntensity: params.ambientIntensity * 1.15,
    }
  }
  return params
}
