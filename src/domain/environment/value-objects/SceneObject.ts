import type { Position3D } from '../../character/value-objects/Position3D'

export type SceneObjectType = 'tree' | 'rock' | 'flower'

export interface SceneObject {
  readonly type: SceneObjectType
  readonly position: Position3D
  readonly scale: number
  readonly rotation: number
}
