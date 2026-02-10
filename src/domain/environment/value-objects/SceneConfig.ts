import type { CharacterStateName } from '../../character/value-objects/CharacterState'
import { STATE_CONFIGS } from '../../character/value-objects/CharacterState'

export interface Direction2D {
  readonly x: number
  readonly z: number
}

export interface SceneConfig {
  readonly direction: Direction2D
  readonly scrollSpeed: number
}

export interface ChunkSpec {
  readonly width: number
  readonly depth: number
  readonly treeCount: number
  readonly grassCount: number
  readonly rockCount: number
  readonly flowerCount: number
}

export function createDefaultSceneConfig(): SceneConfig {
  return {
    direction: { x: 0, z: 1 },
    scrollSpeed: 1.5,
  }
}

export function createDefaultChunkSpec(): ChunkSpec {
  return {
    width: 20,
    depth: 10,
    treeCount: 2,
    grassCount: 50,
    rockCount: 1,
    flowerCount: 3,
  }
}

export function shouldScroll(
  currentState: CharacterStateName
): boolean {
  return STATE_CONFIGS[currentState].scrolling
}
