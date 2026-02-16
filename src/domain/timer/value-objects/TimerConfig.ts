export interface TimerConfig {
  readonly workDurationMs: number
  readonly breakDurationMs: number
  readonly longBreakDurationMs: number
  readonly setsPerCycle: number
}

const DEFAULT_WORK_DURATION_MS = 25 * 60 * 1000
const DEFAULT_BREAK_DURATION_MS = 5 * 60 * 1000
const DEFAULT_LONG_BREAK_DURATION_MS = 15 * 60 * 1000
const DEFAULT_SETS_PER_CYCLE = 1

export function createDefaultConfig(): TimerConfig {
  return {
    workDurationMs: DEFAULT_WORK_DURATION_MS,
    breakDurationMs: DEFAULT_BREAK_DURATION_MS,
    longBreakDurationMs: DEFAULT_LONG_BREAK_DURATION_MS,
    setsPerCycle: DEFAULT_SETS_PER_CYCLE
  }
}

/**
 * VITE_DEBUG_TIMER の値をパースしてTimerConfigを返す。
 * 書式: "work/break/long-break/sets"（秒数）。省略部分は前の値を引き継ぐ。setsデフォルト=2。
 * 無効な値の場合はnullを返す。
 */
export function parseDebugTimer(spec: string): TimerConfig | null {
  if (!spec) return null
  const parts = spec.split('/').map(Number)
  if (parts.length === 0 || parts.length > 4) return null
  if (parts.some(v => isNaN(v) || v <= 0)) return null
  const workSec = parts[0]
  const breakSec = parts[1] ?? workSec
  const longBreakSec = parts[2] ?? breakSec
  const sets = parts[3] ?? 2
  return createConfig(
    workSec * 1000,
    breakSec * 1000,
    longBreakSec * 1000,
    sets
  )
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
