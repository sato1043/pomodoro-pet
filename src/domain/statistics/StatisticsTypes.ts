export interface DailyStats {
  completedCycles: number
  abortedCycles: number
  workPhasesCompleted: number
  breakPhasesCompleted: number
  totalWorkMs: number
  totalBreakMs: number
}

export type StatisticsData = Record<string, DailyStats>

export function emptyDailyStats(): DailyStats {
  return {
    completedCycles: 0,
    abortedCycles: 0,
    workPhasesCompleted: 0,
    breakPhasesCompleted: 0,
    totalWorkMs: 0,
    totalBreakMs: 0,
  }
}

/** 'YYYY-MM-DD' 形式の今日の日付キー */
export function todayKey(): string {
  const d = new Date()
  return formatDateKey(d)
}

/** Date → 'YYYY-MM-DD' 形式の日付キー */
export function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
