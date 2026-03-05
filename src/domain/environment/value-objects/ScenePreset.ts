import type { ChunkSpec } from './SceneConfig'

export type ScenePresetName = 'meadow' | 'seaside' | 'park'

export const ALL_SCENE_PRESETS: readonly ScenePresetName[] = ['meadow', 'seaside', 'park']

export interface ScenePreset {
  readonly name: ScenePresetName
  readonly chunkSpec: ChunkSpec
}

export function createMeadowPreset(): ScenePreset {
  return {
    name: 'meadow',
    chunkSpec: {
      width: 20,
      depth: 10,
      treeCount: 2,
      grassCount: 50,
      rockCount: 1,
      flowerCount: 3,
    },
  }
}

export function createSeasidePreset(): ScenePreset {
  return {
    name: 'seaside',
    chunkSpec: {
      width: 20,
      depth: 10,
      treeCount: 0,
      grassCount: 0,
      rockCount: 0,
      flowerCount: 0,
    },
  }
}

export function createParkPreset(): ScenePreset {
  return {
    name: 'park',
    chunkSpec: {
      width: 20,
      depth: 10,
      treeCount: 1,
      grassCount: 30,
      rockCount: 0,
      flowerCount: 5,
    },
  }
}

export function resolvePreset(name: ScenePresetName): ScenePreset {
  switch (name) {
    case 'meadow': return createMeadowPreset()
    case 'seaside': return createSeasidePreset()
    case 'park': return createParkPreset()
  }
}
