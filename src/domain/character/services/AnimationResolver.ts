import type { CharacterStateName } from '../value-objects/CharacterState'
import { STATE_CONFIGS } from '../value-objects/CharacterState'
import type { CharacterBehavior } from '../value-objects/BehaviorPreset'
import type { EmotionState } from '../value-objects/EmotionState'
import type { InteractionHistory } from '../services/InteractionTracker'
import type { TimeOfDay } from '../../environment/value-objects/WeatherConfig'

export interface AnimationContext {
  readonly state: CharacterStateName
  readonly previousState: CharacterStateName | null
  readonly presetName: CharacterBehavior
  readonly phaseProgress: number
  readonly emotion?: EmotionState
  readonly interaction?: InteractionHistory
  readonly timeOfDay?: TimeOfDay
  readonly todayCompletedCycles?: number
}

export interface AnimationSelection {
  readonly clipName: string
  readonly loop: boolean
  readonly speed?: number
}

export type AnimationResolverFn = (ctx: AnimationContext) => AnimationSelection

export function createDefaultAnimationResolver(): AnimationResolverFn {
  return (ctx: AnimationContext): AnimationSelection => {
    const config = STATE_CONFIGS[ctx.state]
    return {
      clipName: config.animationClip,
      loop: config.loop,
    }
  }
}
