import type { CharacterStateName } from '../value-objects/CharacterState'
import { STATE_CONFIGS } from '../value-objects/CharacterState'
import type { Position3D } from '../value-objects/Position3D'

export type StateTrigger =
  | { type: 'timeout' }
  | { type: 'prompt'; action: CharacterStateName }
  | { type: 'interaction'; kind: 'click' | 'hover' | 'drag_start' | 'drag_end' }

export interface StateTickResult {
  stateChanged: boolean
  newState?: CharacterStateName
  movementDelta?: Position3D
}

export interface BehaviorStateMachine {
  readonly currentState: CharacterStateName
  readonly scrollingAllowed: boolean
  transition(trigger: StateTrigger): CharacterStateName
  tick(deltaMs: number): StateTickResult
  start(): void
  setScrollingAllowed(allowed: boolean): void
}

// タイムアウト時の遷移先テーブル
const TIMEOUT_TRANSITIONS: Record<CharacterStateName, CharacterStateName> = {
  idle: 'wander',
  wander: 'sit',
  sit: 'idle',
  sleep: 'idle',
  happy: 'idle',
  reaction: 'idle',
  dragged: 'dragged' // draggedはタイムアウトしない
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
  let scrollingAllowed = false

  function randomDuration(state: CharacterStateName): number {
    const config = STATE_CONFIGS[state]
    return randomRange(config.minDurationMs, config.maxDurationMs)
  }

  function resolveTimeoutTarget(from: CharacterStateName): CharacterStateName {
    let next = TIMEOUT_TRANSITIONS[from]
    // scrollingAllowed=falseのとき、scrolling状態をスキップ
    if (!scrollingAllowed && STATE_CONFIGS[next].scrolling) {
      next = TIMEOUT_TRANSITIONS[next]
    }
    return next
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
    get scrollingAllowed() { return scrollingAllowed },

    transition(trigger: StateTrigger): CharacterStateName {
      switch (trigger.type) {
        case 'timeout': {
          enterState(resolveTimeoutTarget(currentState))
          return currentState
        }

        case 'prompt': {
          // draggedへはプロンプトで遷移できない
          if (trigger.action === 'dragged') return currentState
          enterState(trigger.action)
          return currentState
        }

        case 'interaction': {
          if (trigger.kind === 'click') {
            enterState('reaction')
            return currentState
          }
          if (trigger.kind === 'drag_start') {
            enterState('dragged')
            return currentState
          }
          if (trigger.kind === 'drag_end') {
            enterState(scrollingAllowed ? 'wander' : 'idle')
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

      // wander中は移動量を返す
      if (currentState === 'wander') {
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

    setScrollingAllowed(allowed: boolean): void {
      scrollingAllowed = allowed
    }
  }
}
