import type { DailyStats, StatisticsData } from '../../domain/statistics/StatisticsTypes'
import { emptyDailyStats } from '../../domain/statistics/StatisticsTypes'

export interface StatisticsService {
  loadFromStorage(): Promise<void>
  getDailyStats(date: string): DailyStats
  getRange(startDate: string, endDate: string): Array<{ date: string; stats: DailyStats }>
  addWorkPhase(date: string, durationMs: number): void
  addBreakPhase(date: string, durationMs: number): void
  addCompletedCycle(date: string): void
  addAbortedCycle(date: string): void
}

/** ストレージから読み込んだデータのバリデーション */
function validateDailyStats(raw: unknown): DailyStats | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>
  if (
    typeof r.completedCycles !== 'number' ||
    typeof r.abortedCycles !== 'number' ||
    typeof r.workPhasesCompleted !== 'number' ||
    typeof r.breakPhasesCompleted !== 'number' ||
    typeof r.totalWorkMs !== 'number' ||
    typeof r.totalBreakMs !== 'number'
  ) return null
  return {
    completedCycles: r.completedCycles,
    abortedCycles: r.abortedCycles,
    workPhasesCompleted: r.workPhasesCompleted,
    breakPhasesCompleted: r.breakPhasesCompleted,
    totalWorkMs: r.totalWorkMs,
    totalBreakMs: r.totalBreakMs,
  }
}

function validateStatisticsData(raw: unknown): StatisticsData {
  const result: StatisticsData = {}
  if (typeof raw !== 'object' || raw === null) return result
  const obj = raw as Record<string, unknown>
  for (const [key, value] of Object.entries(obj)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    const stats = validateDailyStats(value)
    if (stats) result[key] = stats
  }
  return result
}

/** 日付文字列を Date.getTime() で比較可能な値に変換 */
function dateToNum(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getTime()
}

function loadStoredStatistics(): Promise<Record<string, unknown> | null> {
  if (typeof window === 'undefined' || !window.electronAPI?.loadStatistics) return Promise.resolve(null)
  return window.electronAPI.loadStatistics()
}

function saveToStorage(data: StatisticsData): void {
  if (typeof window !== 'undefined' && window.electronAPI?.saveStatistics) {
    window.electronAPI.saveStatistics(data)
  }
}

export function createStatisticsService(): StatisticsService {
  let data: StatisticsData = {}

  function getOrCreate(date: string): DailyStats {
    if (!data[date]) {
      data[date] = emptyDailyStats()
    }
    return data[date]
  }

  return {
    async loadFromStorage(): Promise<void> {
      const raw = await loadStoredStatistics()
      if (raw) {
        data = validateStatisticsData(raw)
      }
    },

    getDailyStats(date: string): DailyStats {
      return data[date] ?? emptyDailyStats()
    },

    getRange(startDate: string, endDate: string): Array<{ date: string; stats: DailyStats }> {
      const startNum = dateToNum(startDate)
      const endNum = dateToNum(endDate)
      const result: Array<{ date: string; stats: DailyStats }> = []

      const cursor = new Date(startDate + 'T00:00:00')
      while (cursor.getTime() <= endNum) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
        if (dateToNum(key) >= startNum) {
          result.push({ date: key, stats: data[key] ?? emptyDailyStats() })
        }
        cursor.setDate(cursor.getDate() + 1)
      }

      return result
    },

    addWorkPhase(date: string, durationMs: number): void {
      const stats = getOrCreate(date)
      stats.workPhasesCompleted++
      stats.totalWorkMs += durationMs
      saveToStorage(data)
    },

    addBreakPhase(date: string, durationMs: number): void {
      const stats = getOrCreate(date)
      stats.breakPhasesCompleted++
      stats.totalBreakMs += durationMs
      saveToStorage(data)
    },

    addCompletedCycle(date: string): void {
      const stats = getOrCreate(date)
      stats.completedCycles++
      saveToStorage(data)
    },

    addAbortedCycle(date: string): void {
      const stats = getOrCreate(date)
      stats.abortedCycles++
      saveToStorage(data)
    },
  }
}
