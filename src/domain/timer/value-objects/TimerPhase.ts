export type PhaseType = 'work' | 'break' | 'long-break'

export interface TimerPhase {
  readonly type: PhaseType
  readonly durationMs: number
}

export function createWorkPhase(durationMs: number): TimerPhase {
  return { type: 'work', durationMs }
}

export function createBreakPhase(durationMs: number): TimerPhase {
  return { type: 'break', durationMs }
}

export function createLongBreakPhase(durationMs: number): TimerPhase {
  return { type: 'long-break', durationMs }
}
