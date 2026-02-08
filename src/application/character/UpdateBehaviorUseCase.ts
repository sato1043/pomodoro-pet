import type { Character } from '../../domain/character/entities/Character'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'
import type { ThreeCharacterHandle } from '../../adapters/three/ThreeCharacterAdapter'
import { createPosition } from '../../domain/character/value-objects/Position3D'

const GROUND_HALF_SIZE = 9 // 地面は20x20、半分の9で制限

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function updateBehavior(
  character: Character,
  stateMachine: BehaviorStateMachine,
  charHandle: ThreeCharacterHandle,
  deltaMs: number
): void {
  const result = stateMachine.tick(deltaMs)

  if (result.stateChanged && result.newState) {
    character.setState(result.newState)
    charHandle.playState(result.newState)
  }

  if (result.movementDelta) {
    const pos = character.position
    const newX = clamp(pos.x + result.movementDelta.x, -GROUND_HALF_SIZE, GROUND_HALF_SIZE)
    const newZ = clamp(pos.z + result.movementDelta.z, -GROUND_HALF_SIZE, GROUND_HALF_SIZE)
    character.setPosition(createPosition(newX, pos.y, newZ))
    charHandle.setPosition(newX, pos.y, newZ)

    // キャラクターの向きを移動方向に合わせる
    if (Math.abs(result.movementDelta.x) > 0.001 || Math.abs(result.movementDelta.z) > 0.001) {
      const angle = Math.atan2(result.movementDelta.x, result.movementDelta.z)
      charHandle.object3D.rotation.y = angle
    }
  }
}
