import type { BiorhythmState, BiorhythmBoost, BiorhythmConfig } from '../../domain/character/value-objects/BiorhythmState'
import {
  resolveBiorhythm,
  tickBoost,
  createFeedingBoost,
  createPettingBoost,
  mergeBoost,
  NEUTRAL_BIORHYTHM,
  ZERO_BOOST,
  DEFAULT_BIORHYTHM_CONFIG,
} from '../../domain/character/value-objects/BiorhythmState'

export interface BiorhythmService {
  readonly state: BiorhythmState
  readonly boost: BiorhythmBoost
  tick(deltaMs: number): void
  applyFeedingBoost(): void
  applyPettingBoost(): void
  setOriginDay(originDay: number): void
}

export function createBiorhythmService(
  initialOriginDay: number,
  config: BiorhythmConfig = DEFAULT_BIORHYTHM_CONFIG,
): BiorhythmService {
  let originDay = initialOriginDay
  let boost: BiorhythmBoost = ZERO_BOOST
  let state: BiorhythmState = NEUTRAL_BIORHYTHM

  return {
    get state() { return state },
    get boost() { return boost },

    tick(deltaMs: number): void {
      boost = tickBoost(boost, deltaMs)
      state = resolveBiorhythm(originDay, Date.now(), boost, config)
    },

    applyFeedingBoost(): void {
      boost = mergeBoost(boost, createFeedingBoost())
      state = resolveBiorhythm(originDay, Date.now(), boost, config)
    },

    applyPettingBoost(): void {
      boost = mergeBoost(boost, createPettingBoost())
      state = resolveBiorhythm(originDay, Date.now(), boost, config)
    },

    setOriginDay(newOriginDay: number): void {
      originDay = newOriginDay
      state = resolveBiorhythm(originDay, Date.now(), boost, config)
    },
  }
}
