import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createStatisticsService, type StatisticsService } from '../../../src/application/statistics/StatisticsService'
import { emptyDailyStats } from '../../../src/domain/statistics/StatisticsTypes'

describe('StatisticsService', () => {
  let service: StatisticsService
  let mockSaveStatistics: ReturnType<typeof vi.fn>
  let mockLoadStatistics: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSaveStatistics = vi.fn()
    mockLoadStatistics = vi.fn().mockResolvedValue(null)

    // window.electronAPI をモック
    Object.defineProperty(globalThis, 'window', {
      value: {
        electronAPI: {
          loadStatistics: mockLoadStatistics,
          saveStatistics: mockSaveStatistics,
        }
      },
      writable: true,
      configurable: true,
    })

    service = createStatisticsService()
  })

  afterEach(() => {
    // @ts-expect-error テスト用のクリーンアップ
    delete globalThis.window
  })

  it('初期状態ではgetDailyStatsがemptyDailyStatsを返す', () => {
    expect(service.getDailyStats('2025-01-15')).toEqual(emptyDailyStats())
  })

  it('addWorkPhaseでworkPhasesCompletedとtotalWorkMsが加算される', () => {
    service.addWorkPhase('2025-01-15', 25 * 60 * 1000)

    const stats = service.getDailyStats('2025-01-15')
    expect(stats.workPhasesCompleted).toBe(1)
    expect(stats.totalWorkMs).toBe(25 * 60 * 1000)
  })

  it('addBreakPhaseでbreakPhasesCompletedとtotalBreakMsが加算される', () => {
    service.addBreakPhase('2025-01-15', 5 * 60 * 1000)

    const stats = service.getDailyStats('2025-01-15')
    expect(stats.breakPhasesCompleted).toBe(1)
    expect(stats.totalBreakMs).toBe(5 * 60 * 1000)
  })

  it('addCompletedCycleでcompletedCyclesがインクリメントされる', () => {
    service.addCompletedCycle('2025-01-15')
    service.addCompletedCycle('2025-01-15')

    const stats = service.getDailyStats('2025-01-15')
    expect(stats.completedCycles).toBe(2)
  })

  it('addAbortedCycleでabortedCyclesがインクリメントされる', () => {
    service.addAbortedCycle('2025-01-15')

    const stats = service.getDailyStats('2025-01-15')
    expect(stats.abortedCycles).toBe(1)
  })

  it('複数日のデータが独立に管理される', () => {
    service.addWorkPhase('2025-01-15', 25 * 60 * 1000)
    service.addWorkPhase('2025-01-16', 50 * 60 * 1000)

    expect(service.getDailyStats('2025-01-15').totalWorkMs).toBe(25 * 60 * 1000)
    expect(service.getDailyStats('2025-01-16').totalWorkMs).toBe(50 * 60 * 1000)
  })

  it('更新のたびにsaveToStorageが呼ばれる', () => {
    service.addWorkPhase('2025-01-15', 25 * 60 * 1000)
    service.addCompletedCycle('2025-01-15')

    expect(mockSaveStatistics).toHaveBeenCalledTimes(2)
  })

  describe('getRange', () => {
    it('指定範囲のデータを返す', () => {
      service.addWorkPhase('2025-01-15', 1000)
      service.addWorkPhase('2025-01-17', 2000)

      const range = service.getRange('2025-01-14', '2025-01-18')
      expect(range).toHaveLength(5)
      expect(range[0]).toEqual({ date: '2025-01-14', stats: emptyDailyStats() })
      expect(range[1].date).toBe('2025-01-15')
      expect(range[1].stats.totalWorkMs).toBe(1000)
      expect(range[3].date).toBe('2025-01-17')
      expect(range[3].stats.totalWorkMs).toBe(2000)
    })

    it('データがない日にはemptyDailyStatsを返す', () => {
      const range = service.getRange('2025-01-01', '2025-01-03')
      expect(range).toHaveLength(3)
      range.forEach(entry => {
        expect(entry.stats).toEqual(emptyDailyStats())
      })
    })
  })

  describe('loadFromStorage', () => {
    it('保存済みデータを復元する', async () => {
      mockLoadStatistics.mockResolvedValue({
        '2025-01-15': {
          completedCycles: 3,
          abortedCycles: 1,
          workPhasesCompleted: 6,
          breakPhasesCompleted: 5,
          totalWorkMs: 150 * 60 * 1000,
          totalBreakMs: 25 * 60 * 1000,
        }
      })

      await service.loadFromStorage()

      const stats = service.getDailyStats('2025-01-15')
      expect(stats.completedCycles).toBe(3)
      expect(stats.workPhasesCompleted).toBe(6)
      expect(stats.totalWorkMs).toBe(150 * 60 * 1000)
    })

    it('不正なデータを無視する', async () => {
      mockLoadStatistics.mockResolvedValue({
        '2025-01-15': { completedCycles: 'invalid' },
        'bad-key': { completedCycles: 1 },
        '2025-01-16': {
          completedCycles: 2,
          abortedCycles: 0,
          workPhasesCompleted: 4,
          breakPhasesCompleted: 3,
          totalWorkMs: 100000,
          totalBreakMs: 50000,
        }
      })

      await service.loadFromStorage()

      expect(service.getDailyStats('2025-01-15')).toEqual(emptyDailyStats())
      expect(service.getDailyStats('2025-01-16').completedCycles).toBe(2)
    })

    it('nullデータの場合何もしない', async () => {
      mockLoadStatistics.mockResolvedValue(null)
      await service.loadFromStorage()

      expect(service.getDailyStats('2025-01-15')).toEqual(emptyDailyStats())
    })
  })
})
