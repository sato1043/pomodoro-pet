import { describe, it, expect } from 'vitest'
import { createDefaultAnimationResolver, type AnimationContext } from '../../../src/domain/character/services/AnimationResolver'
import { STATE_CONFIGS, type CharacterStateName } from '../../../src/domain/character/value-objects/CharacterState'

describe('AnimationResolver', () => {
  const resolver = createDefaultAnimationResolver()

  describe('createDefaultAnimationResolver', () => {
    const allStates: CharacterStateName[] = [
      'idle', 'wander', 'march', 'sit', 'sleep',
      'happy', 'reaction', 'dragged', 'pet', 'refuse', 'feeding'
    ]

    it.each(allStates)('state=%s でSTATE_CONFIGS準拠のアニメーション選択を返す', (state) => {
      const ctx: AnimationContext = {
        state,
        previousState: null,
        presetName: 'autonomous',
        phaseProgress: 0,
      }
      const selection = resolver(ctx)
      const config = STATE_CONFIGS[state]
      expect(selection.clipName).toBe(config.animationClip)
      expect(selection.loop).toBe(config.loop)
    })

    it('speedがundefinedである', () => {
      const ctx: AnimationContext = {
        state: 'idle',
        previousState: null,
        presetName: 'autonomous',
        phaseProgress: 0,
      }
      const selection = resolver(ctx)
      expect(selection.speed).toBeUndefined()
    })

    it('phaseProgressやpreviousStateに関わらず同じ結果を返す', () => {
      const ctx1: AnimationContext = {
        state: 'march',
        previousState: null,
        presetName: 'march-cycle',
        phaseProgress: 0,
      }
      const ctx2: AnimationContext = {
        state: 'march',
        previousState: 'idle',
        presetName: 'march-cycle',
        phaseProgress: 0.9,
      }
      expect(resolver(ctx1)).toEqual(resolver(ctx2))
    })
  })
})
