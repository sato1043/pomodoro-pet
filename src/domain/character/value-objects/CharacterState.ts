export type CharacterStateName =
  | 'idle'
  | 'wander'
  | 'march'
  | 'sit'
  | 'sleep'
  | 'happy'
  | 'reaction'
  | 'dragged'
  | 'pet'
  | 'refuse'
  | 'feeding'

export interface CharacterStateConfig {
  readonly name: CharacterStateName
  readonly animationClip: string
  readonly minDurationMs: number
  readonly maxDurationMs: number
  readonly loop: boolean
  readonly scrolling: boolean
}

export const STATE_CONFIGS: Record<CharacterStateName, CharacterStateConfig> = {
  idle: { name: 'idle', animationClip: 'idle', minDurationMs: 5000, maxDurationMs: 15000, loop: true, scrolling: false },
  wander: { name: 'wander', animationClip: 'walk', minDurationMs: 3000, maxDurationMs: 8000, loop: true, scrolling: false },
  march: { name: 'march', animationClip: 'walk', minDurationMs: 5000, maxDurationMs: 15000, loop: true, scrolling: true },
  sit: { name: 'sit', animationClip: 'sit', minDurationMs: 10000, maxDurationMs: 30000, loop: true, scrolling: false },
  sleep: { name: 'sleep', animationClip: 'sleep', minDurationMs: 15000, maxDurationMs: 60000, loop: true, scrolling: false },
  happy: { name: 'happy', animationClip: 'happy', minDurationMs: 2000, maxDurationMs: 5000, loop: false, scrolling: false },
  reaction: { name: 'reaction', animationClip: 'wave', minDurationMs: 2000, maxDurationMs: 3000, loop: false, scrolling: false },
  dragged: { name: 'dragged', animationClip: 'idle', minDurationMs: 0, maxDurationMs: Infinity, loop: true, scrolling: false },
  pet: { name: 'pet', animationClip: 'pet', minDurationMs: 3000, maxDurationMs: 8000, loop: true, scrolling: false },
  refuse: { name: 'refuse', animationClip: 'refuse', minDurationMs: 1500, maxDurationMs: 2500, loop: false, scrolling: false },
  feeding: { name: 'feeding', animationClip: 'sit', minDurationMs: 3000, maxDurationMs: 5000, loop: true, scrolling: false }
}
