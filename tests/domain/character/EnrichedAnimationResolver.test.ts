import { describe, it, expect } from 'vitest'
import type { AnimationContext } from '../../../src/domain/character/services/AnimationResolver'
import {
  createMarchLateRunRule,
  createMarchMidSpeedRule,
  createReactionVariationRule,
  createRefuseVariationRule,
  createGetUpRule,
  createCelebrateRunRule,
  createFatigueMarchRule,
  createAffinityHappyRule,
  createFullFeedingRefuseRule,
  createClickSpamReactionRule,
  createClickIrritationRule,
  createNightSleepyReactionRule,
  createProductiveHappyReactionRule,
  createOverfedRefuseRule,
  createEnrichedAnimationResolver,
} from '../../../src/domain/character/services/EnrichedAnimationResolver'
import { STATE_CONFIGS } from '../../../src/domain/character/value-objects/CharacterState'

function makeCtx(overrides: Partial<AnimationContext>): AnimationContext {
  return {
    state: 'idle',
    previousState: null,
    presetName: 'autonomous',
    phaseProgress: 0,
    ...overrides,
  }
}

describe('EnrichedAnimationResolver', () => {
  describe('march-late-run rule', () => {
    const rule = createMarchLateRunRule()

    it('march + phaseProgress > 0.7 でマッチする', () => {
      expect(rule.match(makeCtx({ state: 'march', phaseProgress: 0.8 }))).toBe(true)
    })

    it('march + phaseProgress = 0.7 ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'march', phaseProgress: 0.7 }))).toBe(false)
    })

    it('march以外ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'idle', phaseProgress: 0.9 }))).toBe(false)
    })

    it('runクリップをloop=trueで返す', () => {
      const sel = rule.resolve(makeCtx({ state: 'march', phaseProgress: 0.8 }))
      expect(sel.clipName).toBe('run')
      expect(sel.loop).toBe(true)
    })
  })

  describe('march-mid-speed rule', () => {
    const rule = createMarchMidSpeedRule()

    it('march + 0.3 < phaseProgress <= 0.7 でマッチする', () => {
      expect(rule.match(makeCtx({ state: 'march', phaseProgress: 0.5 }))).toBe(true)
      expect(rule.match(makeCtx({ state: 'march', phaseProgress: 0.7 }))).toBe(true)
    })

    it('march + phaseProgress = 0.3 ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'march', phaseProgress: 0.3 }))).toBe(false)
    })

    it('march + phaseProgress > 0.7 ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'march', phaseProgress: 0.8 }))).toBe(false)
    })

    it('walk speed=1.2を返す', () => {
      const sel = rule.resolve(makeCtx({ state: 'march', phaseProgress: 0.5 }))
      expect(sel.clipName).toBe('walk')
      expect(sel.loop).toBe(true)
      expect(sel.speed).toBe(1.2)
    })
  })

  describe('reaction-variation rule', () => {
    it('random < 0.5 でマッチする', () => {
      const rule = createReactionVariationRule(() => 0.3)
      expect(rule.match(makeCtx({ state: 'reaction' }))).toBe(true)
    })

    it('random >= 0.5 ではマッチしない', () => {
      const rule = createReactionVariationRule(() => 0.5)
      expect(rule.match(makeCtx({ state: 'reaction' }))).toBe(false)
    })

    it('attack2をloop=falseで返す', () => {
      const rule = createReactionVariationRule(() => 0.1)
      const sel = rule.resolve(makeCtx({ state: 'reaction' }))
      expect(sel.clipName).toBe('attack2')
      expect(sel.loop).toBe(false)
    })
  })

  describe('refuse-variation rule', () => {
    it('random < 0.5 でマッチする', () => {
      const rule = createRefuseVariationRule(() => 0.3)
      expect(rule.match(makeCtx({ state: 'refuse' }))).toBe(true)
    })

    it('random >= 0.5 ではマッチしない', () => {
      const rule = createRefuseVariationRule(() => 0.5)
      expect(rule.match(makeCtx({ state: 'refuse' }))).toBe(false)
    })

    it('damage2をloop=falseで返す', () => {
      const rule = createRefuseVariationRule(() => 0.1)
      const sel = rule.resolve(makeCtx({ state: 'refuse' }))
      expect(sel.clipName).toBe('damage2')
      expect(sel.loop).toBe(false)
    })
  })

  describe('getup-from-sleep rule', () => {
    const rule = createGetUpRule()

    it('idle + previousState=sleep でマッチする', () => {
      expect(rule.match(makeCtx({ state: 'idle', previousState: 'sleep' }))).toBe(true)
    })

    it('idle + previousState=wander ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'idle', previousState: 'wander' }))).toBe(false)
    })

    it('idle + previousState=null ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'idle', previousState: null }))).toBe(false)
    })

    it('getUpをloop=falseで返す', () => {
      const sel = rule.resolve(makeCtx({ state: 'idle', previousState: 'sleep' }))
      expect(sel.clipName).toBe('getUp')
      expect(sel.loop).toBe(false)
    })
  })

  describe('celebrate-run rule', () => {
    it('happy + celebrate + random < 0.3 でマッチする', () => {
      const rule = createCelebrateRunRule(() => 0.2)
      expect(rule.match(makeCtx({ state: 'happy', presetName: 'celebrate' }))).toBe(true)
    })

    it('happy + celebrate + random >= 0.3 ではマッチしない', () => {
      const rule = createCelebrateRunRule(() => 0.3)
      expect(rule.match(makeCtx({ state: 'happy', presetName: 'celebrate' }))).toBe(false)
    })

    it('happy + 非celebrate ではマッチしない', () => {
      const rule = createCelebrateRunRule(() => 0.1)
      expect(rule.match(makeCtx({ state: 'happy', presetName: 'autonomous' }))).toBe(false)
    })

    it('run speed=1.2をloop=falseで返す', () => {
      const rule = createCelebrateRunRule(() => 0.1)
      const sel = rule.resolve(makeCtx({ state: 'happy', presetName: 'celebrate' }))
      expect(sel.clipName).toBe('run')
      expect(sel.loop).toBe(false)
      expect(sel.speed).toBe(1.2)
    })
  })

  describe('fatigue-march rule', () => {
    const rule = createFatigueMarchRule()
    const highFatigue = { satisfaction: 0.5, fatigue: 0.9, affinity: 0.5 }
    const lowFatigue = { satisfaction: 0.5, fatigue: 0.5, affinity: 0.5 }

    it('march + fatigue > 0.8 でマッチする', () => {
      expect(rule.match(makeCtx({ state: 'march', emotion: highFatigue }))).toBe(true)
    })

    it('march + fatigue <= 0.8 ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'march', emotion: lowFatigue }))).toBe(false)
    })

    it('emotion未設定ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'march' }))).toBe(false)
    })

    it('walk speed=0.8を返す', () => {
      const sel = rule.resolve(makeCtx({ state: 'march', emotion: highFatigue }))
      expect(sel.clipName).toBe('walk')
      expect(sel.speed).toBe(0.8)
    })
  })

  describe('affinity-happy rule', () => {
    const highAffinity = { satisfaction: 0.5, fatigue: 0.5, affinity: 0.8 }
    const lowAffinity = { satisfaction: 0.5, fatigue: 0.5, affinity: 0.3 }

    it('idle + affinity > 0.7 + random < 0.15 でマッチする', () => {
      const rule = createAffinityHappyRule(() => 0.1)
      expect(rule.match(makeCtx({ state: 'idle', previousState: 'wander', emotion: highAffinity }))).toBe(true)
    })

    it('idle + affinity > 0.7 + random >= 0.15 ではマッチしない', () => {
      const rule = createAffinityHappyRule(() => 0.15)
      expect(rule.match(makeCtx({ state: 'idle', previousState: 'wander', emotion: highAffinity }))).toBe(false)
    })

    it('idle + affinity <= 0.7 ではマッチしない', () => {
      const rule = createAffinityHappyRule(() => 0.1)
      expect(rule.match(makeCtx({ state: 'idle', previousState: 'wander', emotion: lowAffinity }))).toBe(false)
    })

    it('idle + previousState=sleep ではマッチしない（getUpルール優先）', () => {
      const rule = createAffinityHappyRule(() => 0.1)
      expect(rule.match(makeCtx({ state: 'idle', previousState: 'sleep', emotion: highAffinity }))).toBe(false)
    })

    it('happyをloop=falseで返す', () => {
      const rule = createAffinityHappyRule(() => 0.1)
      const sel = rule.resolve(makeCtx({ state: 'idle', emotion: highAffinity }))
      expect(sel.clipName).toBe('happy')
      expect(sel.loop).toBe(false)
    })
  })

  describe('full-feeding-refuse rule', () => {
    const rule = createFullFeedingRefuseRule()
    const fullSatisfaction = { satisfaction: 0.95, fatigue: 0.5, affinity: 0.5 }
    const normalSatisfaction = { satisfaction: 0.5, fatigue: 0.5, affinity: 0.5 }

    it('feeding + satisfaction > 0.9 でマッチする', () => {
      expect(rule.match(makeCtx({ state: 'feeding', emotion: fullSatisfaction }))).toBe(true)
    })

    it('feeding + satisfaction <= 0.9 ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'feeding', emotion: normalSatisfaction }))).toBe(false)
    })

    it('attack2をloop=falseで返す', () => {
      const sel = rule.resolve(makeCtx({ state: 'feeding', emotion: fullSatisfaction }))
      expect(sel.clipName).toBe('attack2')
      expect(sel.loop).toBe(false)
    })
  })

  describe('click-spam-reaction rule', () => {
    const rule = createClickSpamReactionRule()

    it('reaction + recentClicks >= 5 でマッチする', () => {
      expect(rule.match(makeCtx({ state: 'reaction', interaction: { recentClicks: 5, totalFeedingsToday: 0 } }))).toBe(true)
    })

    it('reaction + recentClicks < 5 ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'reaction', interaction: { recentClicks: 4, totalFeedingsToday: 0 } }))).toBe(false)
    })

    it('interaction未設定ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'reaction' }))).toBe(false)
    })

    it('damage2をloop=falseで返す', () => {
      const sel = rule.resolve(makeCtx({ state: 'reaction', interaction: { recentClicks: 5, totalFeedingsToday: 0 } }))
      expect(sel.clipName).toBe('damage2')
      expect(sel.loop).toBe(false)
    })
  })

  describe('click-irritation rule', () => {
    const rule = createClickIrritationRule()

    it('reaction + recentClicks >= 3 でマッチする', () => {
      expect(rule.match(makeCtx({ state: 'reaction', interaction: { recentClicks: 3, totalFeedingsToday: 0 } }))).toBe(true)
    })

    it('reaction + recentClicks < 3 ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'reaction', interaction: { recentClicks: 2, totalFeedingsToday: 0 } }))).toBe(false)
    })

    it('damage1をloop=falseで返す', () => {
      const sel = rule.resolve(makeCtx({ state: 'reaction', interaction: { recentClicks: 3, totalFeedingsToday: 0 } }))
      expect(sel.clipName).toBe('damage1')
      expect(sel.loop).toBe(false)
    })
  })

  describe('night-sleepy-reaction rule', () => {
    const rule = createNightSleepyReactionRule()
    const highAffinity = { satisfaction: 0.5, fatigue: 0.5, affinity: 0.6 }
    const lowAffinity = { satisfaction: 0.5, fatigue: 0.5, affinity: 0.3 }

    it('reaction + night + affinity > 0.5 でマッチする', () => {
      expect(rule.match(makeCtx({ state: 'reaction', timeOfDay: 'night', emotion: highAffinity }))).toBe(true)
    })

    it('reaction + day ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'reaction', timeOfDay: 'day', emotion: highAffinity }))).toBe(false)
    })

    it('reaction + night + affinity <= 0.5 ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'reaction', timeOfDay: 'night', emotion: lowAffinity }))).toBe(false)
    })

    it('sleepをloop=falseで返す', () => {
      const sel = rule.resolve(makeCtx({ state: 'reaction', timeOfDay: 'night', emotion: highAffinity }))
      expect(sel.clipName).toBe('sleep')
      expect(sel.loop).toBe(false)
    })
  })

  describe('productive-happy-reaction rule', () => {
    const rule = createProductiveHappyReactionRule()

    it('reaction + todayCompletedCycles >= 3 でマッチする', () => {
      expect(rule.match(makeCtx({ state: 'reaction', todayCompletedCycles: 3 }))).toBe(true)
    })

    it('reaction + todayCompletedCycles < 3 ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'reaction', todayCompletedCycles: 2 }))).toBe(false)
    })

    it('todayCompletedCycles未設定ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'reaction' }))).toBe(false)
    })

    it('happyをloop=falseで返す', () => {
      const sel = rule.resolve(makeCtx({ state: 'reaction', todayCompletedCycles: 3 }))
      expect(sel.clipName).toBe('happy')
      expect(sel.loop).toBe(false)
    })
  })

  describe('overfed-refuse rule', () => {
    const rule = createOverfedRefuseRule()

    it('feeding + totalFeedingsToday >= 5 でマッチする', () => {
      expect(rule.match(makeCtx({ state: 'feeding', interaction: { recentClicks: 0, totalFeedingsToday: 5 } }))).toBe(true)
    })

    it('feeding + totalFeedingsToday < 5 ではマッチしない', () => {
      expect(rule.match(makeCtx({ state: 'feeding', interaction: { recentClicks: 0, totalFeedingsToday: 4 } }))).toBe(false)
    })

    it('attack2をloop=falseで返す', () => {
      const sel = rule.resolve(makeCtx({ state: 'feeding', interaction: { recentClicks: 0, totalFeedingsToday: 5 } }))
      expect(sel.clipName).toBe('attack2')
      expect(sel.loop).toBe(false)
    })
  })

  describe('createEnrichedAnimationResolver (統合)', () => {
    it('ルールにマッチしない場合はデフォルトリゾルバの結果を返す', () => {
      const resolver = createEnrichedAnimationResolver(() => 1.0) // 全ランダムルール不発
      const sel = resolver(makeCtx({ state: 'idle', previousState: 'wander' }))
      const config = STATE_CONFIGS['idle']
      expect(sel.clipName).toBe(config.animationClip)
      expect(sel.loop).toBe(config.loop)
    })

    it('march + phaseProgress=0.9 ではrun/loopを返す', () => {
      const resolver = createEnrichedAnimationResolver()
      const sel = resolver(makeCtx({ state: 'march', phaseProgress: 0.9 }))
      expect(sel.clipName).toBe('run')
      expect(sel.loop).toBe(true)
    })

    it('march + phaseProgress=0.5 ではwalk/speed=1.2を返す', () => {
      const resolver = createEnrichedAnimationResolver()
      const sel = resolver(makeCtx({ state: 'march', phaseProgress: 0.5 }))
      expect(sel.clipName).toBe('walk')
      expect(sel.speed).toBe(1.2)
    })

    it('march + phaseProgress=0.2 ではデフォルトwalkを返す', () => {
      const resolver = createEnrichedAnimationResolver()
      const sel = resolver(makeCtx({ state: 'march', phaseProgress: 0.2 }))
      expect(sel.clipName).toBe('walk')
      expect(sel.speed).toBeUndefined()
    })

    it('idle + previousState=sleep ではgetUpを返す', () => {
      const resolver = createEnrichedAnimationResolver()
      const sel = resolver(makeCtx({ state: 'idle', previousState: 'sleep' }))
      expect(sel.clipName).toBe('getUp')
    })

    it('ルール優先順位: 先にマッチしたルールが適用される', () => {
      // march-late-run が march-mid-speed より先に評価される
      const resolver = createEnrichedAnimationResolver()
      const sel = resolver(makeCtx({ state: 'march', phaseProgress: 0.8 }))
      expect(sel.clipName).toBe('run') // march-late-runが勝つ
    })

    it('fatigue > 0.8 のmarchではwalk speed=0.8を返す（phase進行ルールより優先）', () => {
      const resolver = createEnrichedAnimationResolver()
      const highFatigue = { satisfaction: 0.5, fatigue: 0.9, affinity: 0.5 }
      const sel = resolver(makeCtx({ state: 'march', phaseProgress: 0.9, emotion: highFatigue }))
      expect(sel.clipName).toBe('walk')
      expect(sel.speed).toBe(0.8)
    })

    it('satisfaction > 0.9 のfeedingではattack2を返す', () => {
      const resolver = createEnrichedAnimationResolver()
      const fullSatisfaction = { satisfaction: 0.95, fatigue: 0.5, affinity: 0.5 }
      const sel = resolver(makeCtx({ state: 'feeding', emotion: fullSatisfaction }))
      expect(sel.clipName).toBe('attack2')
    })

    it('recentClicks >= 5 のreactionではdamage2を返す（click spam優先）', () => {
      const resolver = createEnrichedAnimationResolver(() => 0.1) // reactionVariationもマッチするが先にspamが勝つ
      const sel = resolver(makeCtx({ state: 'reaction', interaction: { recentClicks: 5, totalFeedingsToday: 0 } }))
      expect(sel.clipName).toBe('damage2')
    })

    it('recentClicks = 3 のreactionではdamage1を返す（click irritation）', () => {
      const resolver = createEnrichedAnimationResolver(() => 1.0) // ランダムルール不発
      const sel = resolver(makeCtx({ state: 'reaction', interaction: { recentClicks: 3, totalFeedingsToday: 0 } }))
      expect(sel.clipName).toBe('damage1')
    })

    it('totalFeedingsToday >= 5 のfeedingではattack2を返す', () => {
      const resolver = createEnrichedAnimationResolver()
      const sel = resolver(makeCtx({ state: 'feeding', interaction: { recentClicks: 0, totalFeedingsToday: 5 } }))
      expect(sel.clipName).toBe('attack2')
    })
  })
})
