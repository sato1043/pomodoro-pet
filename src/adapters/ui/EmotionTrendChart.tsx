import { useMemo } from 'react'
import type { EmotionHistoryData } from '../../domain/character/value-objects/EmotionHistory'
import type { DailyTrendEntry } from '../../domain/character/value-objects/EmotionHistory'
import { extractDailyTrendEntries } from '../../domain/character/value-objects/EmotionHistory'
import { useAppDeps } from './AppContext'
import * as styles from './styles/emotion-trend-chart.css'

// --- 型定義 ---

interface TrendPoint { readonly x: number; readonly y: number }

interface EmotionTrendCurves {
  readonly satisfaction: TrendPoint[]
  readonly fatigue: TrendPoint[]
  readonly affinity: TrendPoint[]
}

export type TrendPeriod = '7d' | '30d' | 'all'

// --- 純粋関数 ---

/** 選択期間からstartDate/endDateを算出する */
export function computeDateRange(
  period: TrendPeriod,
  data: EmotionHistoryData,
): { startDate: string; endDate: string } {
  const now = new Date()
  const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (period === 'all') {
    const dates = Object.keys(data.daily).sort()
    const startDate = dates.length > 0 ? dates[0] : endDate
    return { startDate, endDate }
  }

  const days = period === '7d' ? 6 : 29
  const start = new Date(now)
  start.setDate(start.getDate() - days)
  const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`
  return { startDate, endDate }
}

/** startDate〜endDateの全日付を埋め、データがない日は直前の値を引き継ぐ */
export function fillDailyGaps(
  entries: DailyTrendEntry[],
  startDate: string,
  endDate: string,
): DailyTrendEntry[] {
  const entryMap = new Map<string, DailyTrendEntry>()
  for (const e of entries) {
    entryMap.set(e.date, e)
  }

  const result: DailyTrendEntry[] = []
  const cursor = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')

  let prev: DailyTrendEntry = {
    date: '', satisfaction: 0, fatigue: 0, affinity: 0,
    pomodoroCompleted: 0, fed: 0, petted: 0,
  }

  // 先頭ギャップ用: 最初のデータ値で埋める
  if (entries.length > 0) {
    prev = { ...entries[0], pomodoroCompleted: 0, fed: 0, petted: 0 }
  }

  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`
    const existing = entryMap.get(key)
    if (existing) {
      result.push(existing)
      prev = existing
    } else {
      result.push({ ...prev, date: key, pomodoroCompleted: 0, fed: 0, petted: 0 })
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return result
}

/** TrendPoint配列をM/L形式のSVG pathに変換する */
function toLinePath(points: TrendPoint[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

/** DailyTrendEntry配列をSVG座標に変換する */
export function buildEmotionTrendData(
  entries: DailyTrendEntry[],
  chartW: number,
  chartH: number,
  padLeft: number,
  padTop: number,
): EmotionTrendCurves {
  const empty: EmotionTrendCurves = {
    satisfaction: [], fatigue: [], affinity: [],
  }
  if (entries.length === 0) return empty

  const n = entries.length

  function toX(i: number): number {
    return padLeft + (n === 1 ? chartW : (i / (n - 1)) * chartW)
  }

  function toY(value: number): number {
    // y=1.0 → padTop（上端）, y=0.0 → padTop+chartH（下端）
    return padTop + (1 - value) * chartH
  }

  const satisfaction: TrendPoint[] = []
  const fatigue: TrendPoint[] = []
  const affinity: TrendPoint[] = []

  for (let i = 0; i < n; i++) {
    const entry = entries[i]
    const x = toX(i)

    satisfaction.push({ x, y: toY(entry.satisfaction) })
    fatigue.push({ x, y: toY(entry.fatigue) })
    affinity.push({ x, y: toY(entry.affinity) })
  }

  return { satisfaction, fatigue, affinity }
}

// --- コンポーネント ---

const PAD_LEFT = 4
const PAD_RIGHT = 50
const PAD_TOP = 8
const PAD_BOTTOM = 4
const WIDTH = 320
const HEIGHT = 80
const CHART_W = WIDTH - PAD_LEFT - PAD_RIGHT
const CHART_H = HEIGHT - PAD_TOP - PAD_BOTTOM

const CURVES = [
  { key: 'satisfaction' as const, color: 'var(--emo-satisfaction)' },
  { key: 'fatigue' as const, color: 'var(--emo-fatigue)' },
  { key: 'affinity' as const, color: 'var(--emo-affinity)' },
]

export default function EmotionTrendChart(): JSX.Element {
  const { emotionHistoryService } = useAppDeps()

  const curves = useMemo(() => {
    const data = emotionHistoryService.getHistory()
    const { startDate, endDate } = computeDateRange('all', data)
    const sparse = extractDailyTrendEntries(data, startDate, endDate)
    const entries = fillDailyGaps(sparse, startDate, endDate)
    return buildEmotionTrendData(entries, CHART_W, CHART_H, PAD_LEFT, PAD_TOP)
  }, [emotionHistoryService])

  const hasData = curves.satisfaction.length > 0

  return (
    <div className={styles.section} data-testid="emotion-trend">
      <div className={styles.title}>Emotion Trends</div>

      {!hasData ? (
        <div className={styles.noData} data-testid="emotion-trend-no-data">No emotion data yet</div>
      ) : (
        <>
          <svg
            className={styles.svg}
            viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
            role="img"
            aria-label="Emotion trend chart showing satisfaction, fatigue, and affinity over time"
            data-testid="emotion-trend-svg"
          >
            {/* X軸・Y軸 */}
            <line
              x1={PAD_LEFT} y1={PAD_TOP + CHART_H}
              x2={PAD_LEFT + CHART_W} y2={PAD_TOP + CHART_H}
              className={styles.axisLine}
            />
            <line
              x1={PAD_LEFT} y1={PAD_TOP}
              x2={PAD_LEFT} y2={PAD_TOP + CHART_H}
              className={styles.axisLine}
            />

            {/* 3曲線 + 末尾ドット */}
            {CURVES.map(({ key, color }) => {
              const points = curves[key]
              const last = points[points.length - 1]
              return (
                <g key={key}>
                  <path
                    d={toLinePath(points)}
                    className={styles.chartLine}
                    style={{ stroke: color }}
                  />
                  <circle cx={last.x} cy={last.y} r={3} fill={color} />
                </g>
              )
            })}
          </svg>

          {/* 凡例 */}
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: 'var(--emo-satisfaction)' }} />
              Satisfaction
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: 'var(--emo-fatigue)' }} />
              Fatigue
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: 'var(--emo-affinity)' }} />
              Affinity
            </span>
          </div>
        </>
      )}
    </div>
  )
}
