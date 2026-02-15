import type { PhaseType } from './TimerPhase'

export type TriggerTiming =
  | { type: 'elapsed'; afterMs: number }
  | { type: 'remaining'; beforeEndMs: number }

export interface PhaseTriggerSpec {
  readonly id: string
  readonly timing: TriggerTiming
}

/** PomodoroStateMachine生成時に注入するトリガー定義 */
export type PhaseTriggerMap = Partial<Record<PhaseType, readonly PhaseTriggerSpec[]>>
