import { useState, useMemo } from 'react'
import type { EmotionHistoryData } from '../../domain/character/value-objects/EmotionHistory'
import type { DailyTrendEntry } from '../../domain/character/value-objects/EmotionHistory'
import { extractDailyTrendEntries } from '../../domain/character/value-objects/EmotionHistory'
import { pointsToPath } from './BiorhythmChart'
import { useAppDeps } from './AppContext'
import * as styles from './styles/emotion-trend-chart.css'

// --- 型定義 ---

interface TrendPoint { readonly x: number; readonly y: number }

interface EmotionTrendCurves {
  readonly satisfaction: TrendPoint[]
  readonly fatigue: TrendPoint[]
  readonly affinity: TrendPoint[]
  readonly dateLabels: Array<{ x: number; label: string }>
  readonly eventBars: Array<{ x: number; height: number; count: number }>
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
    dateLabels: [], eventBars: [],
  }
  if (entries.length === 0) return empty

  const n = entries.length

  function toX(i: number): number {
    return padLeft + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW)
  }

  function toY(value: number): number {
    // y=1.0 → padTop（上端）, y=0.0 → padTop+chartH（下端）
    return padTop + (1 - value) * chartH
  }

  const satisfaction: TrendPoint[] = []
  const fatigue: TrendPoint[] = []
  const affinity: TrendPoint[] = []
  const dateLabels: EmotionTrendCurves['dateLabels'] = []
  const eventBars: EmotionTrendCurves['eventBars'] = []

  // ポモドーロ最大数を算出（バーの高さ正規化用）
  const maxPomodoro = Math.max(...entries.map(e => e.pomodoroCompleted), 1)

  // 日付ラベルの間引き: 最大表示数を決定
  const maxLabels = n <= 10 ? n : Math.min(7, n)
  const labelStep = n <= 1 ? 1 : Math.max(1, Math.floor((n - 1) / (maxLabels - 1)))

  for (let i = 0; i < n; i++) {
    const entry = entries[i]
    const x = toX(i)

    satisfaction.push({ x, y: toY(entry.satisfaction) })
    fatigue.push({ x, y: toY(entry.fatigue) })
    affinity.push({ x, y: toY(entry.affinity) })

    // イベントバー
    if (entry.pomodoroCompleted > 0) {
      const barMaxH = chartH * 0.3
      const height = (entry.pomodoroCompleted / maxPomodoro) * barMaxH
      eventBars.push({ x, height, count: entry.pomodoroCompleted })
    }

    // 日付ラベル（間引き表示）
    if (i % labelStep === 0 || i === n - 1) {
      // 'MM/DD' 形式
      const parts = entry.date.split('-')
      const label = `${parseInt(parts[1])}/${parseInt(parts[2])}`
      dateLabels.push({ x, label })
    }
  }

  return { satisfaction, fatigue, affinity, dateLabels, eventBars }
}

// --- コンポーネント ---

const PAD_LEFT = 24
const PAD_RIGHT = 8
const PAD_TOP = 12
const PAD_BOTTOM = 20
const WIDTH = 320
const HEIGHT = 120
const CHART_W = WIDTH - PAD_LEFT - PAD_RIGHT
const CHART_H = HEIGHT - PAD_TOP - PAD_BOTTOM

const PERIODS: Array<{ value: TrendPeriod; label: string }> = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: 'all', label: 'All' },
]

export default function EmotionTrendChart(): JSX.Element {
  const { emotionHistoryService } = useAppDeps()
  const [period, setPeriod] = useState<TrendPeriod>('7d')

  const curves = useMemo(() => {
    const data = emotionHistoryService.getHistory()
    const { startDate, endDate } = computeDateRange(period, data)
    const entries = extractDailyTrendEntries(data, startDate, endDate)
    return buildEmotionTrendData(entries, CHART_W, CHART_H, PAD_LEFT, PAD_TOP)
  }, [emotionHistoryService, period])

  const hasData = curves.satisfaction.length > 0

  // Y軸グリッド値
  const yGridValues = [0.25, 0.5, 0.75]
  const yAxisLabels = [
    { value: 0, label: '0' },
    { value: 0.5, label: '0.5' },
    { value: 1.0, label: '1.0' },
  ]

  return (
    <div className={styles.section} data-testid="emotion-trend">
      <div className={styles.header}>
        <div className={styles.title}>Emotion Trends</div>
        <div className={styles.periodButtons}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              data-testid={`emotion-trend-period-${p.value}`}
              className={`${styles.periodBtn} ${period === p.value ? styles.periodBtnActive : ''}`}
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

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
            <defs>
              <filter id="emo-glow">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Y軸グリッド線 */}
            {yGridValues.map(v => {
              const y = PAD_TOP + (1 - v) * CHART_H
              return (
                <line
                  key={v}
                  x1={PAD_LEFT} y1={y}
                  x2={PAD_LEFT + CHART_W} y2={y}
                  className={styles.gridLine}
                />
              )
            })}

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

            {/* イベントバー */}
            {curves.eventBars.map((bar, i) => (
              <rect
                key={i}
                x={bar.x - 3}
                y={PAD_TOP + CHART_H - bar.height}
                width={6}
                height={bar.height}
                fill="var(--emo-event-bar)"
                rx={1}
              >
                <title>{`${bar.count} pomodoro${bar.count !== 1 ? 's' : ''}`}</title>
              </rect>
            ))}

            {/* 3曲線 */}
            <path d={pointsToPath(curves.satisfaction)} className={styles.curveSatisfaction} />
            <path d={pointsToPath(curves.fatigue)} className={styles.curveFatigue} />
            <path d={pointsToPath(curves.affinity)} className={styles.curveAffinity} />

            {/* Y軸ラベル */}
            {yAxisLabels.map(({ value, label }) => {
              const y = PAD_TOP + (1 - value) * CHART_H
              return (
                <text
                  key={value}
                  x={PAD_LEFT - 4}
                  y={y + 3}
                  textAnchor="end"
                  className={styles.axisLabel}
                >
                  {label}
                </text>
              )
            })}

            {/* 日付ラベル */}
            {curves.dateLabels.map((dl, i) => (
              <text
                key={i}
                x={dl.x}
                y={PAD_TOP + CHART_H + 12}
                textAnchor="middle"
                className={styles.dateLabel}
              >
                {dl.label}
              </text>
            ))}
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
