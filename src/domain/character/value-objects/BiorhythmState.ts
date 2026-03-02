export interface BiorhythmState {
  readonly activity: number    // -1.0 ~ 1.0
  readonly sociability: number // -1.0 ~ 1.0
  readonly focus: number       // -1.0 ~ 1.0
}

export interface BiorhythmBoost {
  readonly activity: number     // 0.0 ~ 1.0
  readonly sociability: number  // 0.0 ~ 1.0
  readonly remainingMs: number
}

export interface BiorhythmConfig {
  readonly activityPeriodDays: number
  readonly sociabilityPeriodDays: number
  readonly focusPeriodDays: number
  readonly noiseAmplitude: number
}

export const DEFAULT_BIORHYTHM_CONFIG: BiorhythmConfig = {
  activityPeriodDays: 5,
  sociabilityPeriodDays: 7,
  focusPeriodDays: 11,
  noiseAmplitude: 0.1,
}

export const NEUTRAL_BIORHYTHM: BiorhythmState = {
  activity: 0,
  sociability: 0,
  focus: 0,
}

export const ZERO_BOOST: BiorhythmBoost = {
  activity: 0,
  sociability: 0,
  remainingMs: 0,
}

const MS_PER_DAY = 86_400_000
const BOOST_DURATION_MS = 5 * 60 * 1000 // 5 minutes

function clampBio(value: number): number {
  return Math.max(-1, Math.min(1, value))
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function calculateBaseBiorhythm(
  originDay: number,
  now: number,
  config: BiorhythmConfig,
): BiorhythmState {
  const elapsedMs = now - originDay
  const elapsedDays = elapsedMs / MS_PER_DAY

  return {
    activity: Math.sin((2 * Math.PI * elapsedDays) / config.activityPeriodDays),
    sociability: Math.sin((2 * Math.PI * elapsedDays) / config.sociabilityPeriodDays),
    focus: Math.sin((2 * Math.PI * elapsedDays) / config.focusPeriodDays),
  }
}

/**
 * Deterministic noise based on day index using a simple hash.
 * Same dayIndex always produces the same noise values.
 */
export function applyDailyNoise(
  base: BiorhythmState,
  dayIndex: number,
  amplitude: number,
): BiorhythmState {
  if (amplitude === 0) return base

  const noiseA = deterministicNoise(dayIndex, 0) * amplitude
  const noiseS = deterministicNoise(dayIndex, 1) * amplitude
  const noiseF = deterministicNoise(dayIndex, 2) * amplitude

  return {
    activity: clampBio(base.activity + noiseA),
    sociability: clampBio(base.sociability + noiseS),
    focus: clampBio(base.focus + noiseF),
  }
}

function deterministicNoise(dayIndex: number, axis: number): number {
  // sin-based PRNG: maps integer seed to pseudo-random value in [-1, 1]
  const seed = dayIndex * 127 + axis * 311 + 7919
  const raw = Math.sin(seed) * 43758.5453
  return (raw - Math.floor(raw)) * 2 - 1
}

export function applyBoost(state: BiorhythmState, boost: BiorhythmBoost): BiorhythmState {
  if (boost.remainingMs <= 0) return state

  return {
    activity: clampBio(state.activity + boost.activity),
    sociability: clampBio(state.sociability + boost.sociability),
    focus: state.focus, // focus is not affected by boosts
  }
}

export function tickBoost(boost: BiorhythmBoost, deltaMs: number): BiorhythmBoost {
  if (boost.remainingMs <= 0) return ZERO_BOOST

  const newRemaining = Math.max(0, boost.remainingMs - deltaMs)
  if (newRemaining <= 0) return ZERO_BOOST

  const ratio = newRemaining / boost.remainingMs
  return {
    activity: boost.activity * ratio,
    sociability: boost.sociability * ratio,
    remainingMs: newRemaining,
  }
}

export function createFeedingBoost(): BiorhythmBoost {
  return { activity: 0.3, sociability: 0.2, remainingMs: BOOST_DURATION_MS }
}

export function createPettingBoost(): BiorhythmBoost {
  return { activity: 0.1, sociability: 0.4, remainingMs: BOOST_DURATION_MS }
}

export function mergeBoost(existing: BiorhythmBoost, incoming: BiorhythmBoost): BiorhythmBoost {
  return {
    activity: clamp01(existing.activity + incoming.activity),
    sociability: clamp01(existing.sociability + incoming.sociability),
    remainingMs: Math.max(existing.remainingMs, incoming.remainingMs),
  }
}

export function resolveBiorhythm(
  originDay: number,
  now: number,
  boost: BiorhythmBoost,
  config: BiorhythmConfig,
): BiorhythmState {
  const base = calculateBaseBiorhythm(originDay, now, config)
  const dayIndex = Math.floor((now - originDay) / MS_PER_DAY)
  const withNoise = applyDailyNoise(base, dayIndex, config.noiseAmplitude)
  return applyBoost(withNoise, boost)
}
