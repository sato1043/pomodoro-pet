import type { EventBus } from '../../domain/shared/EventBus'
import type { Character } from '../../domain/character/entities/Character'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'
import type { ThreeCharacterHandle } from '../../adapters/three/ThreeCharacterAdapter'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'
import type { AppSceneEvent } from '../app-scene/AppScene'
import type { CharacterBehavior } from '../../domain/character/value-objects/BehaviorPreset'

/**
 * タイマーイベントとAppSceneイベントをキャラクター行動に橋渡しする。
 *
 * BehaviorPresetを切り替えることで宣言的にキャラクター振る舞いを制御する。
 * - work → march-cycle（前進サイクル、インタラクション拒否）
 * - break → rest-cycle（休憩サイクル、happyから開始）
 * - long-break → joyful-rest（happy繰り返しの休憩サイクル）
 * - congrats → celebrate（happy固定）
 * - free/pause/reset → autonomous（自由行動）
 */
export function bridgeTimerToCharacter(
  bus: EventBus,
  character: Character,
  stateMachine: BehaviorStateMachine,
  charHandle: ThreeCharacterHandle
): () => void {
  function switchPreset(presetName: CharacterBehavior): void {
    stateMachine.applyPreset(presetName)
    character.setState(stateMachine.currentState)
    charHandle.playState(stateMachine.currentState)
  }

  const unsubStarted = bus.subscribe<TimerEvent>('PhaseStarted', (event) => {
    if (event.type === 'PhaseStarted') {
      if (event.phase === 'work') {
        switchPreset('march-cycle')
      } else if (event.phase === 'long-break') {
        switchPreset('joyful-rest')
      } else if (event.phase === 'congrats') {
        switchPreset('celebrate')
      } else {
        switchPreset('rest-cycle')
      }
    }
  })

  const unsubPaused = bus.subscribe('TimerPaused', () => {
    switchPreset('autonomous')
  })

  const unsubReset = bus.subscribe('TimerReset', () => {
    switchPreset('autonomous')
  })

  const unsubScene = bus.subscribe<AppSceneEvent>('AppSceneChanged', (event) => {
    if (event.type === 'AppSceneChanged') {
      if (event.scene === 'free') {
        switchPreset('autonomous')
      }
    }
  })

  return () => {
    unsubStarted()
    unsubPaused()
    unsubReset()
    unsubScene()
  }
}
