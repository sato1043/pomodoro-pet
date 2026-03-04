import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createEmotionHistoryService, type EmotionHistoryService } from '../../../src/application/character/EmotionHistoryService'

describe('EmotionHistoryService', () => {
  let service: EmotionHistoryService
  let mockSaveEmotionHistory: ReturnType<typeof vi.fn>
  let mockLoadEmotionHistory: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockSaveEmotionHistory = vi.fn()
    mockLoadEmotionHistory = vi.fn().mockResolvedValue(null)

    Object.defineProperty(globalThis, 'window', {
      value: {
        electronAPI: {
          loadEmotionHistory: mockLoadEmotionHistory,
          saveEmotionHistory: mockSaveEmotionHistory,
        }
      },
      writable: true,
      configurable: true,
    })

    service = createEmotionHistoryService()
  })

  afterEach(() => {
    // @ts-expect-error テスト用のクリーンアップ
    delete globalThis.window
  })

  describe('getLastSession', () => {
    it('初期状態では null を返す', () => {
      expect(service.getLastSession()).toBeNull()
    })

    it('loadFromStorage 後に前回セッションを返す', async () => {
      mockLoadEmotionHistory.mockResolvedValue({
        lastSession: { satisfaction: 0.7, fatigue: 0.3, affinity: 0.5, timestamp: 1000000 },
        daily: {},
        streakDays: 1,
        lastActiveDate: '2026-03-03',
      })

      await service.loadFromStorage()

      const session = service.getLastSession()
      expect(session).toEqual({ satisfaction: 0.7, fatigue: 0.3, affinity: 0.5 })
    })
  })

  describe('loadFromStorage', () => {
    it('保存済みデータを復元する', async () => {
      mockLoadEmotionHistory.mockResolvedValue({
        lastSession: { satisfaction: 0.8, fatigue: 0.1, affinity: 0.6, timestamp: 2000000 },
        daily: {
          '2026-03-02': {
            snapshot: { satisfaction: 0.8, fatigue: 0.1, affinity: 0.6 },
            events: { pomodoroCompleted: 3, pomodoroAborted: 0, fed: 1, petted: 2 },
            lastPomodoroAt: 1000,
            lastFeedingAt: 2000,
          }
        },
        streakDays: 5,
        lastActiveDate: '2026-03-02',
      })

      await service.loadFromStorage()

      const history = service.getHistory()
      expect(history.streakDays).toBe(5)
      expect(history.daily['2026-03-02'].events.pomodoroCompleted).toBe(3)
    })

    it('null データの場合デフォルトにフォールバックする', async () => {
      mockLoadEmotionHistory.mockResolvedValue(null)
      await service.loadFromStorage()

      expect(service.getLastSession()).toBeNull()
      expect(service.getHistory().streakDays).toBe(0)
    })

    it('不正なデータの場合デフォルトにフォールバックする', async () => {
      mockLoadEmotionHistory.mockResolvedValue({ invalid: 'data' })
      await service.loadFromStorage()

      expect(service.getLastSession()).toBeNull()
      expect(service.getHistory().streakDays).toBe(0)
    })

    it('lastSession が不正な場合デフォルトにフォールバックする', async () => {
      mockLoadEmotionHistory.mockResolvedValue({
        lastSession: { satisfaction: 'bad' },
        daily: {},
        streakDays: 1,
        lastActiveDate: '2026-03-03',
      })
      await service.loadFromStorage()

      expect(service.getLastSession()).toBeNull()
    })
  })

  describe('recordEvent', () => {
    it('イベントを記録して保存する', () => {
      service.recordEvent('pomodoroCompleted')

      expect(mockSaveEmotionHistory).toHaveBeenCalledTimes(1)
      const saved = mockSaveEmotionHistory.mock.calls[0][0]
      const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      expect(saved.daily[today].events.pomodoroCompleted).toBe(1)
    })

    it('複数イベントを累積する', () => {
      service.recordEvent('pomodoroCompleted')
      service.recordEvent('pomodoroCompleted')
      service.recordEvent('fed')

      expect(mockSaveEmotionHistory).toHaveBeenCalledTimes(3)
      const saved = mockSaveEmotionHistory.mock.calls[2][0]
      const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      expect(saved.daily[today].events.pomodoroCompleted).toBe(2)
      expect(saved.daily[today].events.fed).toBe(1)
    })

    it('streak を更新する', () => {
      service.recordEvent('pomodoroCompleted')

      const saved = mockSaveEmotionHistory.mock.calls[0][0]
      expect(saved.streakDays).toBe(1)
    })
  })

  describe('saveCurrentState', () => {
    it('lastSession と日次スナップショットを更新して保存する', () => {
      const state = { satisfaction: 0.7, fatigue: 0.3, affinity: 0.5 }
      service.saveCurrentState(state)

      expect(mockSaveEmotionHistory).toHaveBeenCalledTimes(1)
      const saved = mockSaveEmotionHistory.mock.calls[0][0]
      expect(saved.lastSession.satisfaction).toBe(0.7)
      expect(saved.lastSession.fatigue).toBe(0.3)
      expect(saved.lastSession.affinity).toBe(0.5)
      expect(saved.lastSession.timestamp).toBeGreaterThan(0)

      const d = new Date(); const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      expect(saved.daily[today].snapshot).toEqual(state)
    })

    it('streak を更新する', () => {
      const state = { satisfaction: 0.5, fatigue: 0, affinity: 0 }
      service.saveCurrentState(state)

      const saved = mockSaveEmotionHistory.mock.calls[0][0]
      expect(saved.streakDays).toBe(1)
    })
  })

  describe('getHistory', () => {
    it('全履歴データを返す', () => {
      const history = service.getHistory()
      expect(history).toHaveProperty('lastSession')
      expect(history).toHaveProperty('daily')
      expect(history).toHaveProperty('streakDays')
      expect(history).toHaveProperty('lastActiveDate')
    })
  })

  describe('calculateStartupEffect', () => {
    it('lastSession がない場合 null を返す', () => {
      // loadFromStorage 未実行 → lastSession.timestamp === 0
      expect(service.calculateStartupEffect()).toBeNull()
    })

    it('lastSession がある場合、クロスセッション効果を適用した状態を返す', async () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      mockLoadEmotionHistory.mockResolvedValue({
        lastSession: { satisfaction: 0.7, fatigue: 0.3, affinity: 0.5, timestamp: oneHourAgo },
        daily: {},
        streakDays: 0,
        lastActiveDate: '2026-03-03',
      })
      await service.loadFromStorage()

      const result = service.calculateStartupEffect()
      expect(result).not.toBeNull()
      // satisfaction: 0.7 + (-0.02 * 1h) ≈ 0.68
      expect(result!.state.satisfaction).toBeCloseTo(0.68, 1)
      // fatigue: 0.3 + (-0.05 * 1h) ≈ 0.25
      expect(result!.state.fatigue).toBeCloseTo(0.25, 1)
      // affinity: 1h < 4h猶予 → decay=0, streakDays=0 → bonus=0 → 0.5
      expect(result!.state.affinity).toBeCloseTo(0.5, 2)
      // effect の delta 検証
      expect(result!.effect.satisfactionDelta).toBeLessThan(0)
      expect(result!.effect.fatigueDelta).toBeLessThan(0)
    })

    it('streakDays が3以上で affinity ボーナスが反映される', async () => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      mockLoadEmotionHistory.mockResolvedValue({
        lastSession: { satisfaction: 0.7, fatigue: 0.3, affinity: 0.5, timestamp: oneHourAgo },
        daily: {},
        streakDays: 5,
        lastActiveDate: '2026-03-03',
      })
      await service.loadFromStorage()

      const result = service.calculateStartupEffect()
      expect(result).not.toBeNull()
      // streakBonus: 0.01 * (5 - 3 + 1) = 0.03
      // affinity: 1h < 4h猶予 → decay=0, bonus=0.03 → 0.5 + 0.03 = 0.53
      expect(result!.state.affinity).toBeCloseTo(0.53, 2)
      expect(result!.effect.affinityDelta).toBeCloseTo(0.03, 2)
    })

    it('5分未満の再起動では元の状態をそのまま返す', async () => {
      const twoMinutesAgo = Date.now() - 2 * 60 * 1000
      mockLoadEmotionHistory.mockResolvedValue({
        lastSession: { satisfaction: 0.7, fatigue: 0.3, affinity: 0.5, timestamp: twoMinutesAgo },
        daily: {},
        streakDays: 0,
        lastActiveDate: '2026-03-03',
      })
      await service.loadFromStorage()

      const result = service.calculateStartupEffect()
      expect(result).not.toBeNull()
      // 5分未満 → 全delta=0 → 元の状態そのまま
      expect(result!.state).toEqual({ satisfaction: 0.7, fatigue: 0.3, affinity: 0.5 })
      expect(result!.effect).toEqual({ satisfactionDelta: 0, fatigueDelta: 0, affinityDelta: 0 })
    })
  })
})
