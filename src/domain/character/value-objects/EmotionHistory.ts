// --- 感情履歴の型定義 ---

export interface DailyEmotionRecord {
  readonly snapshot: { satisfaction: number; fatigue: number; affinity: number }
  readonly events: {
    pomodoroCompleted: number
    pomodoroAborted: number
    fed: number
    petted: number
  }
  readonly lastPomodoroAt: number | null  // timestamp ms
  readonly lastFeedingAt: number | null   // timestamp ms
}

export interface EmotionHistoryData {
  readonly lastSession: {
    satisfaction: number
    fatigue: number
    affinity: number
    timestamp: number  // 最終保存時刻（ms）
  }
  readonly daily: Record<string, DailyEmotionRecord>  // key: 'YYYY-MM-DD'
  readonly streakDays: number                          // 連続利用日数
  readonly lastActiveDate: string                      // 最終利用日 'YYYY-MM-DD'
}

export type EmotionEventType = 'pomodoroCompleted' | 'pomodoroAborted' | 'fed' | 'petted'

// --- クロスセッション効果 ---

export const CROSS_SESSION = {
  MIN_ELAPSED_MS: 5 * 60 * 1000,              // 5分未満は無視
  SATISFACTION_DECAY_PER_HOUR: -0.02,          // 放置中のsatisfaction減衰/時
  SATISFACTION_DECAY_CAP: -0.30,               // satisfaction減衰上限
  FATIGUE_RECOVERY_PER_HOUR: -0.05,            // 放置中のfatigue回復/時
  AFFINITY_GRACE_HOURS: 4,                     // affinity減衰猶予（時間）
  AFFINITY_DECAY_PER_DAY: -0.03,               // 猶予後のaffinity減衰/日
  AFFINITY_DECAY_CAP: -0.15,                   // affinity減衰上限
  STREAK_BONUS_THRESHOLD: 3,                   // streakボーナス開始日数
  STREAK_BONUS_PER_DAY: 0.01,                  // streakボーナス/日
  STREAK_BONUS_CAP: 0.10,                      // streakボーナス上限
} as const

export interface CrossSessionEffect {
  readonly satisfactionDelta: number
  readonly fatigueDelta: number
  readonly affinityDelta: number
}

// --- ファクトリ関数 ---

export function createEmptyDailyRecord(): DailyEmotionRecord {
  return {
    snapshot: { satisfaction: 0.5, fatigue: 0, affinity: 0 },
    events: { pomodoroCompleted: 0, pomodoroAborted: 0, fed: 0, petted: 0 },
    lastPomodoroAt: null,
    lastFeedingAt: null,
  }
}

export function createDefaultEmotionHistoryData(): EmotionHistoryData {
  return {
    lastSession: { satisfaction: 0.5, fatigue: 0, affinity: 0, timestamp: 0 },
    daily: {},
    streakDays: 0,
    lastActiveDate: '',
  }
}

// --- 純粋関数 ---

/** 日次イベントカウントを加算する */
export function recordEmotionEvent(
  data: EmotionHistoryData,
  date: string,
  eventType: EmotionEventType
): EmotionHistoryData {
  const existing = data.daily[date] ?? createEmptyDailyRecord()
  const now = Date.now()

  const updatedEvents = { ...existing.events, [eventType]: existing.events[eventType] + 1 }

  const isPomodoro = eventType === 'pomodoroCompleted' || eventType === 'pomodoroAborted'
  const isFeeding = eventType === 'fed'

  const updatedRecord: DailyEmotionRecord = {
    ...existing,
    events: updatedEvents,
    lastPomodoroAt: isPomodoro ? now : existing.lastPomodoroAt,
    lastFeedingAt: isFeeding ? now : existing.lastFeedingAt,
  }

  return {
    ...data,
    daily: { ...data.daily, [date]: updatedRecord },
  }
}

/** 最終セッションの感情状態を更新する */
export function updateLastSession(
  data: EmotionHistoryData,
  state: { satisfaction: number; fatigue: number; affinity: number },
  timestamp: number
): EmotionHistoryData {
  return {
    ...data,
    lastSession: { ...state, timestamp },
  }
}

/** 日次スナップショットを更新する */
export function updateDailySnapshot(
  data: EmotionHistoryData,
  date: string,
  state: { satisfaction: number; fatigue: number; affinity: number }
): EmotionHistoryData {
  const existing = data.daily[date] ?? createEmptyDailyRecord()
  return {
    ...data,
    daily: {
      ...data.daily,
      [date]: { ...existing, snapshot: { ...state } },
    },
  }
}

/** 連続利用日数を更新する */
export function updateStreak(
  data: EmotionHistoryData,
  todayDate: string
): EmotionHistoryData {
  if (data.lastActiveDate === '') {
    // 初回利用
    return { ...data, streakDays: 1, lastActiveDate: todayDate }
  }

  if (data.lastActiveDate === todayDate) {
    // 同日 — 変更なし
    return data
  }

  const lastDate = new Date(data.lastActiveDate + 'T00:00:00')
  const today = new Date(todayDate + 'T00:00:00')
  const diffMs = today.getTime() - lastDate.getTime()
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))

  if (diffDays === 1) {
    // 連続
    return { ...data, streakDays: data.streakDays + 1, lastActiveDate: todayDate }
  }

  // 途切れ（2日以上空いた）
  return { ...data, streakDays: 1, lastActiveDate: todayDate }
}

// --- クロスセッション効果の計算 ---

/** 経過時間と連続利用日数からクロスセッション効果を計算する */
export function calculateCrossSessionEffect(
  elapsedMs: number,
  streakDays: number
): CrossSessionEffect {
  // 5分未満の再起動は無視
  if (elapsedMs < CROSS_SESSION.MIN_ELAPSED_MS) {
    return { satisfactionDelta: 0, fatigueDelta: 0, affinityDelta: 0 }
  }

  const elapsedHours = elapsedMs / (1000 * 60 * 60)

  // satisfaction: 放置中に減衰（ペットが退屈になる）
  const rawSatisfactionDelta = CROSS_SESSION.SATISFACTION_DECAY_PER_HOUR * elapsedHours
  const satisfactionDelta = Math.max(CROSS_SESSION.SATISFACTION_DECAY_CAP, rawSatisfactionDelta)

  // fatigue: 放置中に回復（ペットが休息する）
  const fatigueDelta = CROSS_SESSION.FATIGUE_RECOVERY_PER_HOUR * elapsedHours

  // affinity: 猶予時間後に日単位で減衰 + streakボーナス
  const effectiveHours = Math.max(0, elapsedHours - CROSS_SESSION.AFFINITY_GRACE_HOURS)
  const effectiveDays = effectiveHours / 24
  const rawAffinityDecay = CROSS_SESSION.AFFINITY_DECAY_PER_DAY * effectiveDays
  const affinityDecay = Math.max(CROSS_SESSION.AFFINITY_DECAY_CAP, rawAffinityDecay)

  let streakBonus = 0
  if (streakDays >= CROSS_SESSION.STREAK_BONUS_THRESHOLD) {
    streakBonus = Math.min(
      CROSS_SESSION.STREAK_BONUS_CAP,
      CROSS_SESSION.STREAK_BONUS_PER_DAY * (streakDays - CROSS_SESSION.STREAK_BONUS_THRESHOLD + 1)
    )
  }

  return {
    satisfactionDelta,
    fatigueDelta,
    affinityDelta: affinityDecay + streakBonus,
  }
}

// --- 感情推移グラフ用データ変換 ---

export interface DailyTrendEntry {
  readonly date: string          // 'YYYY-MM-DD'
  readonly satisfaction: number  // 0.0〜1.0
  readonly fatigue: number
  readonly affinity: number
  readonly pomodoroCompleted: number
  readonly fed: number
  readonly petted: number
}

/** dailyレコードをstartDate〜endDate範囲で日付昇順配列に変換する */
export function extractDailyTrendEntries(
  data: EmotionHistoryData,
  startDate: string,
  endDate: string,
): DailyTrendEntry[] {
  const entries: DailyTrendEntry[] = []
  for (const [date, record] of Object.entries(data.daily)) {
    if (date < startDate || date > endDate) continue
    entries.push({
      date,
      satisfaction: record.snapshot.satisfaction,
      fatigue: record.snapshot.fatigue,
      affinity: record.snapshot.affinity,
      pomodoroCompleted: record.events.pomodoroCompleted,
      fed: record.events.fed,
      petted: record.events.petted,
    })
  }
  entries.sort((a, b) => a.date.localeCompare(b.date))
  return entries
}

/** クロスセッション効果を感情状態に適用する（クランプ付き） */
export function applyCrossSessionChanges(
  state: { satisfaction: number; fatigue: number; affinity: number },
  effect: CrossSessionEffect
): { satisfaction: number; fatigue: number; affinity: number } {
  return {
    satisfaction: Math.max(0, Math.min(1, state.satisfaction + effect.satisfactionDelta)),
    fatigue: Math.max(0, Math.min(1, state.fatigue + effect.fatigueDelta)),
    affinity: Math.max(0, Math.min(1, state.affinity + effect.affinityDelta)),
  }
}
