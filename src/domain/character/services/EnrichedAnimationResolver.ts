import type { AnimationContext, AnimationSelection, AnimationResolverFn } from './AnimationResolver'
import { createDefaultAnimationResolver } from './AnimationResolver'

export interface EnrichedAnimationRule {
  readonly name: string
  match(ctx: AnimationContext): boolean
  resolve(ctx: AnimationContext): AnimationSelection
}

export function createMarchLateRunRule(): EnrichedAnimationRule {
  return {
    name: 'march-late-run',
    match: (ctx) => ctx.state === 'march' && ctx.phaseProgress > 0.7,
    resolve: () => ({ clipName: 'run', loop: true }),
  }
}

export function createMarchMidSpeedRule(): EnrichedAnimationRule {
  return {
    name: 'march-mid-speed',
    match: (ctx) => ctx.state === 'march' && ctx.phaseProgress > 0.3 && ctx.phaseProgress <= 0.7,
    resolve: () => ({ clipName: 'walk', loop: true, speed: 1.2 }),
  }
}

export function createReactionVariationRule(random: () => number = Math.random): EnrichedAnimationRule {
  return {
    name: 'reaction-variation',
    match: (ctx) => ctx.state === 'reaction' && random() < 0.5,
    resolve: () => ({ clipName: 'attack2', loop: false }),
  }
}

export function createRefuseVariationRule(random: () => number = Math.random): EnrichedAnimationRule {
  return {
    name: 'refuse-variation',
    match: (ctx) => ctx.state === 'refuse' && random() < 0.5,
    resolve: () => ({ clipName: 'damage2', loop: false }),
  }
}

export function createGetUpRule(): EnrichedAnimationRule {
  return {
    name: 'getup-from-sleep',
    match: (ctx) => ctx.state === 'idle' && ctx.previousState === 'sleep',
    resolve: () => ({ clipName: 'getUp', loop: false }),
  }
}

export function createCelebrateRunRule(random: () => number = Math.random): EnrichedAnimationRule {
  return {
    name: 'celebrate-run',
    match: (ctx) => ctx.state === 'happy' && ctx.presetName === 'celebrate' && random() < 0.3,
    resolve: () => ({ clipName: 'run', loop: false, speed: 1.2 }),
  }
}

export function createFatigueMarchRule(): EnrichedAnimationRule {
  return {
    name: 'fatigue-march',
    match: (ctx) => ctx.state === 'march' && (ctx.emotion?.fatigue ?? 0) > 0.8,
    resolve: () => ({ clipName: 'walk', loop: true, speed: 0.8 }),
  }
}

export function createAffinityHappyRule(random: () => number = Math.random): EnrichedAnimationRule {
  return {
    name: 'affinity-happy',
    match: (ctx) => ctx.state === 'idle' && ctx.previousState !== 'sleep' && (ctx.emotion?.affinity ?? 0) > 0.7 && random() < 0.15,
    resolve: () => ({ clipName: 'happy', loop: false }),
  }
}

export function createFullFeedingRefuseRule(): EnrichedAnimationRule {
  return {
    name: 'full-feeding-refuse',
    match: (ctx) => ctx.state === 'feeding' && (ctx.emotion?.satisfaction ?? 0) > 0.9,
    resolve: () => ({ clipName: 'attack2', loop: false }),
  }
}

export function createClickSpamReactionRule(): EnrichedAnimationRule {
  return {
    name: 'click-spam-reaction',
    match: (ctx) => ctx.state === 'reaction' && (ctx.interaction?.recentClicks ?? 0) >= 5,
    resolve: () => ({ clipName: 'damage2', loop: false }),
  }
}

export function createClickIrritationRule(): EnrichedAnimationRule {
  return {
    name: 'click-irritation',
    match: (ctx) => ctx.state === 'reaction' && (ctx.interaction?.recentClicks ?? 0) >= 3,
    resolve: () => ({ clipName: 'damage1', loop: false }),
  }
}

export function createNightSleepyReactionRule(): EnrichedAnimationRule {
  return {
    name: 'night-sleepy-reaction',
    match: (ctx) => ctx.state === 'reaction' && ctx.timeOfDay === 'night' && (ctx.emotion?.affinity ?? 0) > 0.5,
    resolve: () => ({ clipName: 'sleep', loop: false }),
  }
}

export function createProductiveHappyReactionRule(): EnrichedAnimationRule {
  return {
    name: 'productive-happy-reaction',
    match: (ctx) => ctx.state === 'reaction' && (ctx.todayCompletedCycles ?? 0) >= 3,
    resolve: () => ({ clipName: 'happy', loop: false }),
  }
}

export function createOverfedRefuseRule(): EnrichedAnimationRule {
  return {
    name: 'overfed-refuse',
    match: (ctx) => ctx.state === 'feeding' && (ctx.interaction?.totalFeedingsToday ?? 0) >= 5,
    resolve: () => ({ clipName: 'attack2', loop: false }),
  }
}

export function createEnrichedAnimationResolver(
  random: () => number = Math.random
): AnimationResolverFn {
  const fallback = createDefaultAnimationResolver()
  const rules: EnrichedAnimationRule[] = [
    // 感情ルール（fatigue/affinity/satisfaction）
    createFatigueMarchRule(),
    createFullFeedingRefuseRule(),
    createOverfedRefuseRule(),
    // リアクションルール（click spam → irritation → night → productive → variation）
    createClickSpamReactionRule(),
    createClickIrritationRule(),
    createNightSleepyReactionRule(),
    createProductiveHappyReactionRule(),
    // Phase 2ルール
    createMarchLateRunRule(),
    createMarchMidSpeedRule(),
    createReactionVariationRule(random),
    createRefuseVariationRule(random),
    createGetUpRule(),
    createCelebrateRunRule(random),
    // affinityルールは最後（他ルールより優先度低い）
    createAffinityHappyRule(random),
  ]

  return (ctx: AnimationContext): AnimationSelection => {
    for (const rule of rules) {
      if (rule.match(ctx)) {
        return rule.resolve(ctx)
      }
    }
    return fallback(ctx)
  }
}
