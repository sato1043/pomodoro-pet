export interface TimerConfig {
  readonly workDurationMs: number
  readonly breakDurationMs: number
}

const DEFAULT_WORK_DURATION_MS = 25 * 60 * 1000
const DEFAULT_BREAK_DURATION_MS = 5 * 60 * 1000

export function createDefaultConfig(): TimerConfig {
  return {
    workDurationMs: DEFAULT_WORK_DURATION_MS,
    breakDurationMs: DEFAULT_BREAK_DURATION_MS
  }
}

export function createConfig(workDurationMs: number, breakDurationMs: number): TimerConfig {
  if (workDurationMs <= 0) throw new Error('workDurationMs must be positive')
  if (breakDurationMs <= 0) throw new Error('breakDurationMs must be positive')
  return { workDurationMs, breakDurationMs }
}
