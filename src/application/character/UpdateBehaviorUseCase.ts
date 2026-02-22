import type { Character } from '../../domain/character/entities/Character'
import type { BehaviorStateMachine } from '../../domain/character/services/BehaviorStateMachine'
import type { AnimationResolverFn, AnimationContext } from '../../domain/character/services/AnimationResolver'
import type { EmotionState } from '../../domain/character/value-objects/EmotionState'
import type { InteractionHistory } from '../../domain/character/services/InteractionTracker'
import type { TimeOfDay } from '../../domain/environment/value-objects/WeatherConfig'
import type { ThreeCharacterHandle } from '../../adapters/three/ThreeCharacterAdapter'
import type { ScrollManager, ScrollState } from '../environment/ScrollUseCase'

export interface UpdateBehaviorOptions {
  readonly resolveAnimation?: AnimationResolverFn
  readonly getPhaseProgress?: () => number
  readonly getEmotion?: () => EmotionState
  readonly getInteraction?: () => InteractionHistory
  readonly getTimeOfDay?: () => TimeOfDay
  readonly getTodayCompletedCycles?: () => number
}

export function updateBehavior(
  character: Character,
  stateMachine: BehaviorStateMachine,
  charHandle: ThreeCharacterHandle,
  deltaMs: number,
  scrollManager: ScrollManager,
  onScrollUpdate: (state: ScrollState) => void,
  options?: UpdateBehaviorOptions
): void {
  const phaseProgress = options?.getPhaseProgress?.() ?? 0
  const result = stateMachine.tick(deltaMs, phaseProgress)

  if (result.stateChanged && result.newState) {
    character.setState(result.newState)

    if (options?.resolveAnimation) {
      const ctx: AnimationContext = {
        state: result.newState,
        previousState: stateMachine.previousState,
        presetName: stateMachine.currentPreset,
        phaseProgress,
        emotion: options.getEmotion?.(),
        interaction: options.getInteraction?.(),
        timeOfDay: options.getTimeOfDay?.(),
        todayCompletedCycles: options.getTodayCompletedCycles?.(),
      }
      const selection = options.resolveAnimation(ctx)
      charHandle.playAnimation(selection)
    } else {
      charHandle.playState(result.newState)
    }
  }

  // スクロール状態を更新してインフラ層に通知
  const isScrolling = stateMachine.isScrollingState()
  const scrollState = scrollManager.tick(deltaMs, isScrolling)
  onScrollUpdate(scrollState)
}
