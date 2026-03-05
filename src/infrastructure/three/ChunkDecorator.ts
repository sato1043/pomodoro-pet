import type * as THREE from 'three'
import type { ChunkSpec } from '../../domain/environment/value-objects/SceneConfig'
import type { ScenePresetName } from '../../domain/environment/value-objects/ScenePreset'
import { createMeadowDecorator } from './decorators/MeadowDecorator'
import { createSeasideDecorator } from './decorators/SeasideDecorator'
import { createParkDecorator } from './decorators/ParkDecorator'

export interface ChunkDecorator {
  populate(group: THREE.Group, spec: ChunkSpec, ground: THREE.Mesh): void
  dispose(): void
}

export function createChunkDecorator(presetName: ScenePresetName): ChunkDecorator {
  switch (presetName) {
    case 'meadow':
      return createMeadowDecorator()
    case 'seaside':
      return createSeasideDecorator()
    case 'park':
      return createParkDecorator()
  }
}
