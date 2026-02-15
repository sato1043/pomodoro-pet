import type { Character } from '../../domain/character/entities/Character'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'
import type { ThreeCharacterHandle } from '../../adapters/three/ThreeCharacterAdapter'
import type { ScrollManager, ScrollState } from '../environment/ScrollUseCase'

export function updateBehavior(
  character: Character,
  stateMachine: BehaviorStateMachine,
  charHandle: ThreeCharacterHandle,
  deltaMs: number,
  scrollManager: ScrollManager,
  onScrollUpdate: (state: ScrollState) => void
): void {
  const result = stateMachine.tick(deltaMs)

  if (result.stateChanged && result.newState) {
    character.setState(result.newState)
    charHandle.playState(result.newState)
  }

  // スクロール状態を更新してインフラ層に通知
  const isScrolling = stateMachine.isScrollingState()
  const scrollState = scrollManager.tick(deltaMs, isScrolling)
  onScrollUpdate(scrollState)
}
