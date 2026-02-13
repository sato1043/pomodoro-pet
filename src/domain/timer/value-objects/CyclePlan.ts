import type { TimerConfig } from './TimerConfig'
import type { PhaseType } from './TimerPhase'

export interface CyclePhase {
  readonly type: PhaseType
  readonly durationMs: number
  readonly setNumber: number
}

/**
 * TimerConfigからサイクル全体のフェーズ順列を生成する。
 * Sets=1: [work, break]（Long Breakなし）
 * Sets>1: [work, break, ..., work, long-break]（最終セットのみLong Break）
 */
export function buildCyclePlan(config: TimerConfig): CyclePhase[] {
  const phases: CyclePhase[] = []

  for (let set = 1; set <= config.setsPerCycle; set++) {
    phases.push({
      type: 'work',
      durationMs: config.workDurationMs,
      setNumber: set
    })

    const isLastSet = set === config.setsPerCycle
    if (isLastSet && config.setsPerCycle > 1) {
      phases.push({
        type: 'long-break',
        durationMs: config.longBreakDurationMs,
        setNumber: set
      })
    } else {
      phases.push({
        type: 'break',
        durationMs: config.breakDurationMs,
        setNumber: set
      })
    }
  }

  return phases
}

export function cycleTotalMs(plan: CyclePhase[]): number {
  return plan.reduce((sum, phase) => sum + phase.durationMs, 0)
}
