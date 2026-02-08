export type CharacterStateName =
  | 'idle'
  | 'wander'
  | 'sit'
  | 'sleep'
  | 'happy'
  | 'reaction'
  | 'dragged'

export interface CharacterStateConfig {
  readonly name: CharacterStateName
  readonly animationClip: string
  readonly minDurationMs: number
  readonly maxDurationMs: number
  readonly loop: boolean
}

export const STATE_CONFIGS: Record<CharacterStateName, CharacterStateConfig> = {
  idle: { name: 'idle', animationClip: 'idle', minDurationMs: 5000, maxDurationMs: 15000, loop: true },
  wander: { name: 'wander', animationClip: 'walk', minDurationMs: 3000, maxDurationMs: 8000, loop: true },
  sit: { name: 'sit', animationClip: 'sit', minDurationMs: 10000, maxDurationMs: 30000, loop: true },
  sleep: { name: 'sleep', animationClip: 'sleep', minDurationMs: 15000, maxDurationMs: 60000, loop: true },
  happy: { name: 'happy', animationClip: 'happy', minDurationMs: 2000, maxDurationMs: 5000, loop: false },
  reaction: { name: 'reaction', animationClip: 'wave', minDurationMs: 2000, maxDurationMs: 3000, loop: false },
  dragged: { name: 'dragged', animationClip: 'idle', minDurationMs: 0, maxDurationMs: Infinity, loop: true }
}
