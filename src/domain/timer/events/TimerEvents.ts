import type { PhaseType } from '../value-objects/TimerPhase'

export type TimerEvent =
  | { type: 'PhaseStarted'; phase: PhaseType; timestamp: number }
  | { type: 'PhaseCompleted'; phase: PhaseType; timestamp: number }
  | { type: 'SetCompleted'; setNumber: number; totalSets: number; timestamp: number }
  | { type: 'CycleCompleted'; cycleNumber: number; timestamp: number }
  | { type: 'TimerTicked'; remainingMs: number }
  | { type: 'TimerPaused'; elapsedMs: number }
  | { type: 'TimerReset' }
  | { type: 'TriggerFired'; triggerId: string; phase: PhaseType; timestamp: number }
