import type { EmotionState, EmotionEvent } from '../../domain/character/value-objects/EmotionState'
import { createDefaultEmotionState, applyEmotionEvent, tickEmotion } from '../../domain/character/value-objects/EmotionState'

export interface EmotionService {
  readonly state: EmotionState
  tick(deltaMs: number, isWorking: boolean): void
  applyEvent(event: EmotionEvent): void
  loadAffinity(affinity: number): void
}

export function createEmotionService(initialAffinity: number = 0): EmotionService {
  let state: EmotionState = createDefaultEmotionState(initialAffinity)

  return {
    get state() { return state },

    tick(deltaMs: number, isWorking: boolean): void {
      state = tickEmotion(state, deltaMs, isWorking)
    },

    applyEvent(event: EmotionEvent): void {
      state = applyEmotionEvent(state, event)
    },

    loadAffinity(affinity: number): void {
      state = createDefaultEmotionState(affinity)
    },
  }
}
