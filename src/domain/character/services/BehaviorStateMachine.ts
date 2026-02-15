import type { CharacterStateName } from '../value-objects/CharacterState'
import { STATE_CONFIGS } from '../value-objects/CharacterState'
import type { Position3D } from '../value-objects/Position3D'
import type { CharacterBehavior, BehaviorPreset } from '../value-objects/BehaviorPreset'
import { BEHAVIOR_PRESETS } from '../value-objects/BehaviorPreset'

export type InteractionKind =
  | 'click' | 'hover'
  | 'drag_start' | 'drag_end'
  | 'pet_start' | 'pet_end'

export type StateTrigger =
  | { type: 'timeout' }
  | { type: 'prompt'; action: CharacterStateName }
  | { type: 'interaction'; kind: InteractionKind }

export interface StateTickResult {
  stateChanged: boolean
  newState?: CharacterStateName
  movementDelta?: Position3D
}

export interface BehaviorStateMachine {
  readonly currentState: CharacterStateName
  readonly currentPreset: CharacterBehavior
  isInteractionLocked(): boolean
  isScrollingState(): boolean
  applyPreset(presetName: CharacterBehavior): void
  transition(trigger: StateTrigger): CharacterStateName
  tick(deltaMs: number): StateTickResult
  start(): void
  keepAlive(): void
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

export interface BehaviorStateMachineOptions {
  readonly fixedWanderDirection?: { x: number; z: number }
}

export function createBehaviorStateMachine(
  options?: BehaviorStateMachineOptions
): BehaviorStateMachine {
  let currentState: CharacterStateName = 'idle'
  let elapsedMs = 0
  let currentDurationMs = randomDuration(currentState)
  let wanderTarget: Position3D | null = null
  let wanderDirection: Position3D = { x: 0, y: 0, z: 0 }
  const fixedDir = options?.fixedWanderDirection ?? null
  let preset: BehaviorPreset = BEHAVIOR_PRESETS['autonomous']

  function randomDuration(state: CharacterStateName): number {
    const config = STATE_CONFIGS[state]
    return randomRange(config.minDurationMs, config.maxDurationMs)
  }

  function resolveTimeoutTarget(from: CharacterStateName): CharacterStateName {
    if (preset.lockedState !== null) {
      return preset.lockedState
    }
    return preset.transitions[from] ?? preset.initialState
  }

  function enterState(state: CharacterStateName): void {
    currentState = state
    elapsedMs = 0
    currentDurationMs = randomDuration(state)

    if (state === 'wander') {
      pickNewWanderTarget()
    } else {
      wanderTarget = null
    }
  }

  function pickNewWanderTarget(): void {
    const angle = Math.random() * Math.PI * 2
    const dist = 1 + Math.random() * 3
    wanderTarget = {
      x: Math.cos(angle) * dist,
      y: 0,
      z: Math.sin(angle) * dist
    }
    const len = dist
    wanderDirection = {
      x: Math.cos(angle) / len,
      y: 0,
      z: Math.sin(angle) / len
    }
  }

  return {
    get currentState() { return currentState },
    get currentPreset() { return preset.name },

    isInteractionLocked(): boolean {
      return preset.interactionLocked
    },

    isScrollingState(): boolean {
      return preset.scrollingStates.has(currentState)
    },

    applyPreset(presetName: CharacterBehavior): void {
      preset = BEHAVIOR_PRESETS[presetName]
      enterState(preset.initialState)
    },

    transition(trigger: StateTrigger): CharacterStateName {
      switch (trigger.type) {
        case 'timeout': {
          enterState(resolveTimeoutTarget(currentState))
          return currentState
        }

        case 'prompt': {
          if (trigger.action === 'dragged') return currentState
          enterState(trigger.action)
          return currentState
        }

        case 'interaction': {
          // drag_end/pet_endは進行中インタラクションの終了なので常に許可
          if (trigger.kind === 'drag_end') {
            enterState(preset.initialState)
            return currentState
          }
          if (trigger.kind === 'pet_end') {
            enterState('idle')
            return currentState
          }

          // インタラクションロック中は拒否
          if (preset.interactionLocked) {
            if (currentState !== 'refuse') {
              enterState('refuse')
            }
            return currentState
          }

          if (trigger.kind === 'click') {
            enterState('reaction')
            return currentState
          }
          if (trigger.kind === 'drag_start') {
            enterState('dragged')
            return currentState
          }
          if (trigger.kind === 'pet_start') {
            enterState('pet')
            return currentState
          }
          // hover: 変化なし
          return currentState
        }
      }
    },

    tick(deltaMs: number): StateTickResult {
      elapsedMs += deltaMs

      // dragged状態はタイムアウトしない
      if (currentState === 'dragged') {
        return { stateChanged: false }
      }

      // 最大持続時間チェック
      if (elapsedMs >= currentDurationMs) {
        enterState(resolveTimeoutTarget(currentState))
        return {
          stateChanged: true,
          newState: currentState
        }
      }

      // march中はfixedDir方向に前進する
      if (currentState === 'march') {
        const speed = 1.5 // units/sec
        const moveDist = speed * (deltaMs / 1000)
        if (fixedDir) {
          return {
            stateChanged: false,
            movementDelta: {
              x: fixedDir.x * moveDist,
              y: 0,
              z: fixedDir.z * moveDist
            }
          }
        }
        return { stateChanged: false }
      }

      // wander中はランダム方向にうろつく
      if (currentState === 'wander') {
        const speed = 1.5 // units/sec
        const moveDist = speed * (deltaMs / 1000)
        if (wanderTarget) {
          return {
            stateChanged: false,
            movementDelta: {
              x: wanderDirection.x * moveDist,
              y: 0,
              z: wanderDirection.z * moveDist
            }
          }
        }
      }

      return { stateChanged: false }
    },

    start(): void {
      elapsedMs = 0
      currentDurationMs = randomDuration(currentState)
    },

    keepAlive(): void {
      elapsedMs = 0
    },
  }
}
