import type { EventBus } from '../../domain/shared/EventBus'
import type { Character } from '../../domain/character/entities/Character'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'
import type { ThreeCharacterHandle } from '../../adapters/three/ThreeCharacterAdapter'
import type { TimerEvent } from '../../domain/timer/events/TimerEvents'

/**
 * タイマーイベントをキャラクター行動に橋渡しする。
 *
 * - 作業Phase完了 → キャラクターが喜ぶ (happy)
 * - 休憩Phase開始 → キャラクターが自由行動 (idle → 自律遷移)
 * - 作業Phase開始 → キャラクターが集中 (sit)
 */
export function bridgeTimerToCharacter(
  bus: EventBus,
  character: Character,
  stateMachine: BehaviorStateMachine,
  charHandle: ThreeCharacterHandle
): () => void {
  function applyAction(action: 'happy' | 'sit' | 'idle'): void {
    stateMachine.transition({ type: 'prompt', action })
    character.setState(action)
    charHandle.playState(action)
    stateMachine.start()
  }

  const unsubCompleted = bus.subscribe<TimerEvent>('PhaseCompleted', (event) => {
    if (event.type === 'PhaseCompleted' && event.phase === 'work') {
      applyAction('happy')
    }
  })

  const unsubStarted = bus.subscribe<TimerEvent>('PhaseStarted', (event) => {
    if (event.type === 'PhaseStarted') {
      if (event.phase === 'work') {
        applyAction('sit')
      } else {
        // 'break' および 'long-break' は同じ扱い（自由行動）
        applyAction('idle')
      }
    }
  })

  const unsubReset = bus.subscribe('TimerReset', () => {
    applyAction('idle')
  })

  return () => {
    unsubCompleted()
    unsubStarted()
    unsubReset()
  }
}
