export interface EmotionState {
  readonly satisfaction: number // 0.0〜1.0
  readonly fatigue: number     // 0.0〜1.0
  readonly affinity: number    // 0.0〜1.0
}

export type EmotionEvent =
  | { type: 'fed' }
  | { type: 'petted' }
  | { type: 'pomodoro_completed' }
  | { type: 'pomodoro_aborted' }

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function createDefaultEmotionState(affinity: number = 0): EmotionState {
  return {
    satisfaction: 0.5,
    fatigue: 0,
    affinity: clamp01(affinity),
  }
}

const EVENT_EFFECTS: Record<EmotionEvent['type'], Partial<Record<keyof EmotionState, number>>> = {
  fed: { satisfaction: 0.15, affinity: 0.05 },
  petted: { affinity: 0.10 },
  pomodoro_completed: { satisfaction: 0.20, fatigue: -0.10 },
  pomodoro_aborted: { satisfaction: -0.10 },
}

export function applyEmotionEvent(state: EmotionState, event: EmotionEvent): EmotionState {
  const effects = EVENT_EFFECTS[event.type]
  return {
    satisfaction: clamp01(state.satisfaction + (effects.satisfaction ?? 0)),
    fatigue: clamp01(state.fatigue + (effects.fatigue ?? 0)),
    affinity: clamp01(state.affinity + (effects.affinity ?? 0)),
  }
}

// 自然変化レート（per ms）
const FATIGUE_WORK_RATE = 0.0000001      // work中: 25分(1,500,000ms)で約+0.15
const FATIGUE_RECOVERY_RATE = -0.00000005 // 非work時: 回復（workの半分の速度）
const SATISFACTION_DECAY_RATE = -0.00000001 // 非work時: 緩やかに減衰
const AFFINITY_DECAY_RATE = -0.000000001   // 常時: 非常に緩やかに減衰（約16分で-0.001）

export function tickEmotion(state: EmotionState, deltaMs: number, isWorking: boolean): EmotionState {
  let { satisfaction, fatigue, affinity } = state

  if (isWorking) {
    fatigue += FATIGUE_WORK_RATE * deltaMs
  } else {
    fatigue += FATIGUE_RECOVERY_RATE * deltaMs
    satisfaction += SATISFACTION_DECAY_RATE * deltaMs
  }

  affinity += AFFINITY_DECAY_RATE * deltaMs

  return {
    satisfaction: clamp01(satisfaction),
    fatigue: clamp01(fatigue),
    affinity: clamp01(affinity),
  }
}
