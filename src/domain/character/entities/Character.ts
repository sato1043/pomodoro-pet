import type { CharacterStateName } from '../value-objects/CharacterState'
import type { Position3D } from '../value-objects/Position3D'
import { createPosition } from '../value-objects/Position3D'

export interface Character {
  readonly currentState: CharacterStateName
  readonly position: Position3D
  setState(state: CharacterStateName): void
  setPosition(position: Position3D): void
}

export function createCharacter(): Character {
  let currentState: CharacterStateName = 'idle'
  let position: Position3D = createPosition(0, 0, 0)

  return {
    get currentState() { return currentState },
    get position() { return position },

    setState(state: CharacterStateName): void {
      currentState = state
    },

    setPosition(pos: Position3D): void {
      position = pos
    }
  }
}
