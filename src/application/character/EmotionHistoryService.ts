import type { EmotionHistoryData, EmotionEventType, CrossSessionEffect } from '../../domain/character/value-objects/EmotionHistory'
import {
  createDefaultEmotionHistoryData,
  recordEmotionEvent,
  updateLastSession,
  updateDailySnapshot,
  updateStreak,
  calculateCrossSessionEffect,
  applyCrossSessionChanges,
} from '../../domain/character/value-objects/EmotionHistory'

export interface EmotionHistoryService {
  loadFromStorage(): Promise<void>
  getLastSession(): { satisfaction: number; fatigue: number; affinity: number } | null
  calculateStartupEffect(): { state: { satisfaction: number; fatigue: number; affinity: number }; effect: CrossSessionEffect } | null
  recordEvent(eventType: EmotionEventType): void
  saveCurrentState(state: { satisfaction: number; fatigue: number; affinity: number }): void
  getHistory(): EmotionHistoryData
}

/** 今日の日付文字列を返す（YYYY-MM-DD） */
function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** ストレージからデータを読み込む */
function loadStoredHistory(): Promise<Record<string, unknown> | null> {
  if (typeof window === 'undefined' || !window.electronAPI?.loadEmotionHistory) return Promise.resolve(null)
  return window.electronAPI.loadEmotionHistory()
}

/** ストレージにデータを保存する */
function saveToStorage(data: EmotionHistoryData): void {
  if (typeof window !== 'undefined' && window.electronAPI?.saveEmotionHistory) {
    window.electronAPI.saveEmotionHistory(data as unknown as Record<string, unknown>)
  }
}

/** 読み込んだデータのバリデーション */
function validateEmotionHistoryData(raw: unknown): EmotionHistoryData | null {
  if (typeof raw !== 'object' || raw === null) return null
  const r = raw as Record<string, unknown>

  // lastSession バリデーション
  if (typeof r.lastSession !== 'object' || r.lastSession === null) return null
  const ls = r.lastSession as Record<string, unknown>
  if (
    typeof ls.satisfaction !== 'number' ||
    typeof ls.fatigue !== 'number' ||
    typeof ls.affinity !== 'number' ||
    typeof ls.timestamp !== 'number'
  ) return null

  // streakDays / lastActiveDate バリデーション
  if (typeof r.streakDays !== 'number') return null
  if (typeof r.lastActiveDate !== 'string') return null

  // daily はオプション（空でも可）
  const daily: EmotionHistoryData['daily'] = {}
  if (typeof r.daily === 'object' && r.daily !== null) {
    for (const [key, value] of Object.entries(r.daily as Record<string, unknown>)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
      if (typeof value !== 'object' || value === null) continue
      // 日次レコードの簡易バリデーション（snapshot と events の存在確認）
      const rec = value as Record<string, unknown>
      if (typeof rec.snapshot !== 'object' || rec.snapshot === null) continue
      if (typeof rec.events !== 'object' || rec.events === null) continue
      daily[key] = value as EmotionHistoryData['daily'][string]
    }
  }

  return {
    lastSession: {
      satisfaction: ls.satisfaction as number,
      fatigue: ls.fatigue as number,
      affinity: ls.affinity as number,
      timestamp: ls.timestamp as number,
    },
    daily,
    streakDays: r.streakDays as number,
    lastActiveDate: r.lastActiveDate as string,
  }
}

export function createEmotionHistoryService(): EmotionHistoryService {
  let data: EmotionHistoryData = createDefaultEmotionHistoryData()

  return {
    async loadFromStorage(): Promise<void> {
      const raw = await loadStoredHistory()
      if (raw) {
        const validated = validateEmotionHistoryData(raw)
        if (validated) {
          data = validated
        }
      }
    },

    getLastSession(): { satisfaction: number; fatigue: number; affinity: number } | null {
      if (data.lastSession.timestamp === 0) return null
      return {
        satisfaction: data.lastSession.satisfaction,
        fatigue: data.lastSession.fatigue,
        affinity: data.lastSession.affinity,
      }
    },

    calculateStartupEffect(): { state: { satisfaction: number; fatigue: number; affinity: number }; effect: CrossSessionEffect } | null {
      if (data.lastSession.timestamp === 0) return null
      const elapsedMs = Date.now() - data.lastSession.timestamp
      const effect = calculateCrossSessionEffect(elapsedMs, data.streakDays)
      const lastSession = {
        satisfaction: data.lastSession.satisfaction,
        fatigue: data.lastSession.fatigue,
        affinity: data.lastSession.affinity,
      }
      const adjustedState = applyCrossSessionChanges(lastSession, effect)
      return { state: adjustedState, effect }
    },

    recordEvent(eventType: EmotionEventType): void {
      const today = todayKey()
      data = recordEmotionEvent(data, today, eventType)
      data = updateStreak(data, today)
      saveToStorage(data)
    },

    saveCurrentState(state: { satisfaction: number; fatigue: number; affinity: number }): void {
      const now = Date.now()
      const today = todayKey()
      data = updateLastSession(data, state, now)
      data = updateDailySnapshot(data, today, state)
      data = updateStreak(data, today)
      saveToStorage(data)
    },

    getHistory(): EmotionHistoryData {
      return data
    },
  }
}
