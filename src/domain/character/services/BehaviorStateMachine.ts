import type { CharacterStateName } from '../value-objects/CharacterState'
import { STATE_CONFIGS } from '../value-objects/CharacterState'
import type { Position3D } from '../value-objects/Position3D'

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
  readonly scrollingAllowed: boolean
  readonly lockedState: CharacterStateName | null
  isInteractionLocked(): boolean
  transition(trigger: StateTrigger): CharacterStateName
  tick(deltaMs: number): StateTickResult
  start(): void
  keepAlive(): void
  setScrollingAllowed(allowed: boolean): void
  lockState(state: CharacterStateName): void
  unlockState(): void
}

// タイムアウト時の遷移先テーブル
const TIMEOUT_TRANSITIONS: Record<CharacterStateName, CharacterStateName> = {
  idle: 'wander',
  wander: 'sit',
  march: 'idle', // 一息ついてからまたmarchに復帰（resolveTimeoutTargetで昇格）
  sit: 'idle',
  sleep: 'idle',
  happy: 'idle',
  reaction: 'idle',
  dragged: 'dragged', // draggedはタイムアウトしない
  pet: 'idle',
  refuse: 'idle'
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
  let lockedState: CharacterStateName | null = null

  function randomDuration(state: CharacterStateName): number {
    const config = STATE_CONFIGS[state]
    return randomRange(config.minDurationMs, config.maxDurationMs)
  }

  function resolveTimeoutTarget(from: CharacterStateName): CharacterStateName {
    // ロック中はロック対象の状態に自己遷移する
    if (lockedState !== null) {
      return lockedState
    }
    let next = TIMEOUT_TRANSITIONS[from]
    // scrollingAllowed=trueのとき、wanderをmarchに昇格（work中は歩きではなく前進）
    if (scrollingAllowed && next === 'wander') {
      next = 'march'
    }
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
    get lockedState() { return lockedState },

    isInteractionLocked(): boolean {
      return (currentState === 'march' || currentState === 'refuse') && scrollingAllowed
    },

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
          // ポモドーロ作業中（march/refuse+scrollingAllowed）は全インタラクションを拒否
          if ((currentState === 'march' || currentState === 'refuse') && scrollingAllowed) {
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
          if (trigger.kind === 'drag_end') {
            enterState(scrollingAllowed ? 'march' : 'idle')
            return currentState
          }
          if (trigger.kind === 'pet_start') {
            enterState('pet')
            return currentState
          }
          if (trigger.kind === 'pet_end') {
            enterState('idle')
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

    setScrollingAllowed(allowed: boolean): void {
      scrollingAllowed = allowed
    },

    lockState(state: CharacterStateName): void {
      lockedState = state
    },

    unlockState(): void {
      lockedState = null
    }
  }
}
