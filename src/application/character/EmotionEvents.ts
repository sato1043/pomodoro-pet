import type { EmotionState } from '../../domain/character/value-objects/EmotionState'

export interface EmotionStateUpdatedEvent {
  readonly type: 'EmotionStateUpdated'
  readonly state: EmotionState
}
