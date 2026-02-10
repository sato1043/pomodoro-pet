export interface TimerConfig {
  readonly workDurationMs: number
  readonly breakDurationMs: number
  readonly longBreakDurationMs: number
  readonly setsPerCycle: number
}

const DEFAULT_WORK_DURATION_MS = 25 * 60 * 1000
const DEFAULT_BREAK_DURATION_MS = 5 * 60 * 1000
const DEFAULT_LONG_BREAK_DURATION_MS = 15 * 60 * 1000
const DEFAULT_SETS_PER_CYCLE = 4

export function createDefaultConfig(): TimerConfig {
  return {
    workDurationMs: DEFAULT_WORK_DURATION_MS,
    breakDurationMs: DEFAULT_BREAK_DURATION_MS,
    longBreakDurationMs: DEFAULT_LONG_BREAK_DURATION_MS,
    setsPerCycle: DEFAULT_SETS_PER_CYCLE
  }
}

export function createConfig(
  workDurationMs: number,
  breakDurationMs: number,
  longBreakDurationMs: number = DEFAULT_LONG_BREAK_DURATION_MS,
  setsPerCycle: number = DEFAULT_SETS_PER_CYCLE
): TimerConfig {
  if (workDurationMs <= 0) throw new Error('workDurationMs must be positive')
  if (breakDurationMs <= 0) throw new Error('breakDurationMs must be positive')
  if (longBreakDurationMs <= 0) throw new Error('longBreakDurationMs must be positive')
  if (setsPerCycle <= 0 || !Number.isInteger(setsPerCycle)) throw new Error('setsPerCycle must be a positive integer')
  return { workDurationMs, breakDurationMs, longBreakDurationMs, setsPerCycle }
}
