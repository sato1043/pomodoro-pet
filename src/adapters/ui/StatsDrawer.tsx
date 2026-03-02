import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import type { DailyStats } from '../../domain/statistics/StatisticsTypes'
import { todayKey, formatDateKey } from '../../domain/statistics/StatisticsTypes'
import type { BiorhythmConfig } from '../../domain/character/value-objects/BiorhythmState'
import { DEFAULT_BIORHYTHM_CONFIG } from '../../domain/character/value-objects/BiorhythmState'
import type { StatisticsService } from '../../application/statistics/StatisticsService'
import { useAppDeps } from './AppContext'
import { useLicenseMode } from './LicenseContext'
import { OverlayTitle } from './OverlayTitle'
import { EmotionIndicator } from './EmotionIndicator'
import * as styles from './styles/stats-drawer.css'

// --- 純粋関数 ---

function fmtMinutes(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  const m = min % 60
  if (m === 0) return `${h}h`
  return `${h}h${m}m`
}

function sumStats(entries: Array<{ stats: DailyStats }>): { workPhases: number; workMs: number } {
  let workPhases = 0
  let workMs = 0
  for (const { stats } of entries) {
    workPhases += stats.workPhasesCompleted
    workMs += stats.totalWorkMs
  }
  return { workPhases, workMs }
}

/** 過去nDays分の集計を取得 */
function getRecentSum(
  service: StatisticsService,
  days: number
): { workPhases: number; workMs: number } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - (days - 1))
  const range = service.getRange(formatDateKey(start), formatDateKey(end))
  return sumStats(range)
}

/** ヒートマップ用の13週分データ構築 */
interface HeatmapCell {
  date: string
  workPhases: number
  dayOfWeek: number
  weekIndex: number
}

function buildHeatmapData(service: StatisticsService): {
  cells: HeatmapCell[]
  months: Array<{ label: string; weekIndex: number }>
  totalWeeks: number
} {
  const WEEKS = 13
  const today = new Date()
  const todayDow = today.getDay() // 0=Sun

  // 13週前の日曜日から開始
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - todayDow - (WEEKS - 1) * 7)

  const endDate = new Date(today)
  const range = service.getRange(formatDateKey(startDate), formatDateKey(endDate))

  const statsMap = new Map<string, DailyStats>()
  for (const entry of range) {
    statsMap.set(entry.date, entry.stats)
  }

  const cells: HeatmapCell[] = []
  const months: Array<{ label: string; weekIndex: number }> = []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  let lastMonth = -1

  const cursor = new Date(startDate)
  let weekIndex = 0

  while (cursor <= endDate) {
    const dow = cursor.getDay()
    if (dow === 0 && cells.length > 0) {
      weekIndex++
    }

    const key = formatDateKey(cursor)
    const stats = statsMap.get(key)
    cells.push({
      date: key,
      workPhases: stats?.workPhasesCompleted ?? 0,
      dayOfWeek: dow,
      weekIndex,
    })

    const month = cursor.getMonth()
    if (month !== lastMonth) {
      months.push({ label: monthNames[month], weekIndex })
      lastMonth = month
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  return { cells, months, totalWeeks: weekIndex + 1 }
}

/** 折れ線グラフ用の日別累計(work+break)時間データ構築 */
interface ChartPoint {
  date: string
  totalMs: number // work + break の合計ms
}

function buildCumulativeData(service: StatisticsService): ChartPoint[] {
  const WEEKS = 13
  const today = new Date()
  const todayDow = today.getDay()

  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - todayDow - (WEEKS - 1) * 7)

  const range = service.getRange(formatDateKey(startDate), formatDateKey(today))

  return range.map(entry => ({
    date: entry.date,
    totalMs: entry.stats.totalWorkMs + entry.stats.totalBreakMs,
  }))
}

/** work完了数からヒートマップのレベル(0-4)を返す。5回で最大 */
function heatLevel(workPhases: number): number {
  if (workPhases === 0) return 0
  if (workPhases <= 1) return 1
  if (workPhases <= 2) return 2
  if (workPhases <= 4) return 3
  return 4
}

// --- コンポーネント ---

interface SummaryCardProps {
  readonly label: string
  readonly workPhases: number
  readonly workMs: number
}

function SummaryCard({ label, workPhases, workMs }: SummaryCardProps): JSX.Element {
  return (
    <div className={styles.summaryCard}>
      <div className={styles.summaryLabel}>{label}</div>
      <div className={styles.summaryValue}>{workPhases}</div>
      <div className={styles.summarySub}>
        {workPhases === 1 ? 'work' : 'works'}
      </div>
      <div className={styles.summarySub}>{fmtMinutes(workMs)}</div>
    </div>
  )
}

const LEVEL_COLORS = [
  'transparent',
  'rgba(var(--work-rgb), 0.15)',
  'rgba(var(--work-rgb), 0.3)',
  'rgba(var(--work-rgb), 0.5)',
  'rgba(var(--work-rgb), 0.7)',
]

const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

interface CalendarHeatmapProps {
  readonly service: StatisticsService
}

function CalendarHeatmap({ service }: CalendarHeatmapProps): JSX.Element {
  const { cells, months, totalWeeks } = useMemo(() => buildHeatmapData(service), [service])

  const cellSize = 11
  const cellGap = 2
  const step = cellSize + cellGap
  const leftPad = 24
  const topPad = 16
  const svgWidth = leftPad + totalWeeks * step + 4
  const svgHeight = topPad + 7 * step + 4

  return (
    <div className={styles.heatmapSection}>
      <div className={styles.heatmapTitle}>Activity (13 weeks)</div>
      <svg
        className={styles.heatmapSvg}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label="Calendar heatmap showing work activity"
      >
        {/* 月ラベル */}
        {months.map((m, i) => (
          <text
            key={i}
            x={leftPad + m.weekIndex * step}
            y={10}
            className={styles.heatmapMonthLabel}
          >
            {m.label}
          </text>
        ))}

        {/* 曜日ラベル */}
        {DAY_LABELS.map((label, dow) =>
          label ? (
            <text
              key={dow}
              x={0}
              y={topPad + dow * step + cellSize - 2}
              className={styles.heatmapDayLabel}
            >
              {label}
            </text>
          ) : null
        )}

        {/* セル */}
        {cells.map((cell) => {
          const level = heatLevel(cell.workPhases)
          const x = leftPad + cell.weekIndex * step
          const y = topPad + cell.dayOfWeek * step
          const todayStr = todayKey()
          const isToday = cell.date === todayStr

          return (
            <rect
              key={cell.date}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              rx={2}
              fill={level === 0
                ? 'var(--heatmap-empty)'
                : LEVEL_COLORS[level]}
              stroke={isToday ? 'var(--heatmap-today-stroke)' : 'none'}
              strokeWidth={isToday ? 1.5 : 0}
            >
              <title>{`${cell.date}: ${cell.workPhases} ${cell.workPhases === 1 ? 'work' : 'works'}`}</title>
            </rect>
          )
        })}
      </svg>

      {/* 凡例 */}
      <div className={styles.legend}>
        <span>Less</span>
        {[0, 1, 2, 3, 4].map(level => (
          <span
            key={level}
            className={styles.legendCell}
            style={{
              background: level === 0
                ? 'var(--heatmap-empty)'
                : LEVEL_COLORS[level],
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}

interface CumulativeChartProps {
  readonly service: StatisticsService
}

function CumulativeChart({ service }: CumulativeChartProps): JSX.Element {
  const points = useMemo(() => buildCumulativeData(service), [service])

  // 累計を計算
  let cumulative = 0
  const cumulativePoints = points.map(p => {
    cumulative += p.totalMs
    return cumulative
  })

  const maxVal = Math.max(...cumulativePoints, 1) // 0除算防止
  const lastVal = cumulativePoints[cumulativePoints.length - 1] ?? 0
  const lastMin = Math.round(lastVal / 60000)

  // SVGレイアウト
  const width = 320
  const height = 80
  const padLeft = 4
  const padRight = 50 // ラベル用スペース
  const padTop = 8
  const padBottom = 4
  const chartW = width - padLeft - padRight
  const chartH = height - padTop - padBottom

  const n = cumulativePoints.length
  if (n === 0) {
    return (
      <div className={styles.chartSection}>
        <div className={styles.chartTitle}>Cumulative Time</div>
        <div className={styles.legend}>No data</div>
      </div>
    )
  }

  // ポイントを座標に変換
  const coords = cumulativePoints.map((val, i) => ({
    x: padLeft + (n === 1 ? chartW : (i / (n - 1)) * chartW),
    y: padTop + chartH - (val / maxVal) * chartH,
  }))

  // polyline用path
  const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')

  const last = coords[coords.length - 1]

  return (
    <div className={styles.chartSection}>
      <div className={styles.chartTitle}>Cumulative Time</div>
      <svg
        className={styles.chartSvg}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Cumulative work and break time line chart"
      >
        {/* X軸 */}
        <line
          x1={padLeft} y1={padTop + chartH}
          x2={padLeft + chartW} y2={padTop + chartH}
          className={styles.chartAxis}
        />
        {/* Y軸 */}
        <line
          x1={padLeft} y1={padTop}
          x2={padLeft} y2={padTop + chartH}
          className={styles.chartAxis}
        />

        {/* 折れ線 */}
        <path
          d={pathD}
          className={styles.chartLine}
        />

        {/* 最後のプロット（脈動アニメーション） */}
        <defs>
          <radialGradient id="pulse-glow">
            <stop offset="0%" stopColor="rgba(var(--work-rgb), 0.6)" />
            <stop offset="60%" stopColor="rgba(var(--work-rgb), 0.15)" />
            <stop offset="100%" stopColor="rgba(var(--work-rgb), 0)" />
          </radialGradient>
        </defs>
        {/* にじみ（グラデーション円） */}
        <circle
          cx={last.x}
          cy={last.y}
          r="8"
          fill="url(#pulse-glow)"
          className={styles.chartGlow}
          style={{ transformOrigin: `${last.x}px ${last.y}px` }}
        />
        {/* 実体の丸 */}
        <circle
          cx={last.x}
          cy={last.y}
          r="3"
          fill="rgba(var(--work-rgb), 0.85)"
        />

        {/* 累計分数ラベル */}
        <text
          x={last.x + 8}
          y={last.y + 4}
          className={styles.chartLabel}
        >
          {fmtMinutes(lastVal)}
        </text>
      </svg>
    </div>
  )
}

// --- Biorhythm chart ---

const MS_PER_DAY = 86_400_000

interface BioPoint { x: number; y: number }

interface BiorhythmCurves {
  activity: BioPoint[]
  sociability: BioPoint[]
  focus: BioPoint[]
  todayX: number
  todayValues: { activity: number; sociability: number; focus: number }
}

/**
 * 前後daysBefore〜daysAfter日のサインカーブ座標を生成する純粋関数
 */
function buildBiorhythmCurves(
  originDay: number,
  config: BiorhythmConfig,
  chartW: number,
  chartH: number,
  padLeft: number,
  padTop: number,
  daysBefore = 14,
  daysAfter = 14,
  samplesPerDay = 4,
): BiorhythmCurves {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const totalDays = daysBefore + daysAfter
  const totalSamples = totalDays * samplesPerDay + 1
  const centerY = padTop + chartH / 2
  const halfH = chartH / 2

  function toCoords(sampleIdx: number, value: number): BioPoint {
    return {
      x: padLeft + (sampleIdx / (totalSamples - 1)) * chartW,
      y: centerY - value * halfH,
    }
  }

  function sineValue(elapsedDays: number, period: number): number {
    return Math.sin((2 * Math.PI * elapsedDays) / period)
  }

  const activity: BioPoint[] = []
  const sociability: BioPoint[] = []
  const focus: BioPoint[] = []

  for (let i = 0; i < totalSamples; i++) {
    const dayOffset = -daysBefore + i / samplesPerDay
    const timestamp = todayStart + dayOffset * MS_PER_DAY
    const elapsedDays = (timestamp - originDay) / MS_PER_DAY

    activity.push(toCoords(i, sineValue(elapsedDays, config.activityPeriodDays)))
    sociability.push(toCoords(i, sineValue(elapsedDays, config.sociabilityPeriodDays)))
    focus.push(toCoords(i, sineValue(elapsedDays, config.focusPeriodDays)))
  }

  // 今日の位置（daysBefore日目 = サンプルインデックス daysBefore * samplesPerDay）
  const todaySampleIdx = daysBefore * samplesPerDay
  const todayX = padLeft + (todaySampleIdx / (totalSamples - 1)) * chartW

  const elapsedToday = (todayStart - originDay) / MS_PER_DAY
  const todayValues = {
    activity: sineValue(elapsedToday, config.activityPeriodDays),
    sociability: sineValue(elapsedToday, config.sociabilityPeriodDays),
    focus: sineValue(elapsedToday, config.focusPeriodDays),
  }

  return { activity, sociability, focus, todayX, todayValues }
}

function pointsToPath(points: BioPoint[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

const BIO_PAD_LEFT = 4
const BIO_PAD_RIGHT = 50
const BIO_PAD_TOP = 12
const BIO_PAD_BOTTOM = 20
const BIO_WIDTH = 320
const BIO_HEIGHT = 100
const BIO_CHART_W = BIO_WIDTH - BIO_PAD_LEFT - BIO_PAD_RIGHT
const BIO_CHART_H = BIO_HEIGHT - BIO_PAD_TOP - BIO_PAD_BOTTOM

function BiorhythmChart(): JSX.Element {
  const { settingsService } = useAppDeps()

  const curves = useMemo(() => {
    const { originDay } = settingsService.biorhythmConfig
    return buildBiorhythmCurves(
      originDay,
      DEFAULT_BIORHYTHM_CONFIG,
      BIO_CHART_W,
      BIO_CHART_H,
      BIO_PAD_LEFT,
      BIO_PAD_TOP,
      3,
      3,
    )
  }, [settingsService])

  const centerY = BIO_PAD_TOP + BIO_CHART_H / 2
  const halfH = BIO_CHART_H / 2

  return (
    <div className={styles.bioSection}>
      <div className={styles.chartTitle} style={{ marginRight: 20 }}>Rhythm</div>
      <svg
        className={styles.bioSvg}
        viewBox={`0 0 ${BIO_WIDTH} ${BIO_HEIGHT}`}
        role="img"
        aria-label="Biorhythm sine curves for activity, sociability, and focus"
      >
        <defs>
          <filter id="bio-glow">
            <feGaussianBlur stdDeviation="1" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* サインカーブ */}
        <path id="bio-path-activity" d={pointsToPath(curves.activity)} className={styles.bioCurveActivity} />
        <path id="bio-path-sociability" d={pointsToPath(curves.sociability)} className={styles.bioCurveSociability} />
        <path id="bio-path-focus" d={pointsToPath(curves.focus)} className={styles.bioCurveFocus} />

        {/* カーブ上を移動するドット */}
        {([
          { pathId: '#bio-path-activity', color: 'var(--bio-activity)', dur: '20s' },
          { pathId: '#bio-path-sociability', color: 'var(--bio-sociability)', dur: '23s' },
          { pathId: '#bio-path-focus', color: 'var(--bio-focus)', dur: '26s' },
        ] as const).map(({ pathId, color, dur }, i) => (
          <g key={i}>
            <circle r="4" fill={color} opacity={0.1}>
              <animateMotion dur={dur} repeatCount="indefinite">
                <mpath href={pathId} />
              </animateMotion>
            </circle>
            <circle r="2.5" fill={color} opacity={0.4}>
              <animateMotion dur={dur} repeatCount="indefinite">
                <mpath href={pathId} />
              </animateMotion>
            </circle>
          </g>
        ))}

      </svg>

      {/* 凡例 */}
      <div className={styles.bioLegend}>
        <span className={styles.bioLegendItem}>
          <span className={styles.bioLegendDot} style={{ background: 'var(--bio-activity)' }} />
          Activity
        </span>
        <span className={styles.bioLegendItem}>
          <span className={styles.bioLegendDot} style={{ background: 'var(--bio-sociability)' }} />
          Sociability
        </span>
        <span className={styles.bioLegendItem}>
          <span className={styles.bioLegendDot} style={{ background: 'var(--bio-focus)' }} />
          Focus
        </span>
      </div>
    </div>
  )
}

interface StatsDrawerProps {
  readonly onClose: () => void
}

export function StatsDrawer({ onClose }: StatsDrawerProps): JSX.Element {
  const { bus, statisticsService } = useAppDeps()
  const { canUse } = useLicenseMode()

  const todayStats = useMemo(() => {
    const key = todayKey()
    return statisticsService.getDailyStats(key)
  }, [statisticsService])

  const weekSum = useMemo(() => getRecentSum(statisticsService, 7), [statisticsService])
  const monthSum = useMemo(() => getRecentSum(statisticsService, 30), [statisticsService])

  return createPortal(
    <div
      className={styles.drawer}
      style={{
        // CSS変数でテーマ依存の色をSVGに渡す
        '--work-rgb': 'var(--theme-work-rgb)',
        '--heatmap-empty': 'var(--theme-heatmap-empty)',
        '--heatmap-today-stroke': 'var(--theme-heatmap-today-stroke)',
      } as React.CSSProperties}
    >
      <OverlayTitle />
      <div className={styles.heading}>Statistics</div>

      <div className={styles.summaryGrid}>
        <SummaryCard label="Today" workPhases={todayStats.workPhasesCompleted} workMs={todayStats.totalWorkMs} />
        <SummaryCard label="7 Days" workPhases={weekSum.workPhases} workMs={weekSum.workMs} />
        <SummaryCard label="30 Days" workPhases={monthSum.workPhases} workMs={monthSum.workMs} />
      </div>

      <CalendarHeatmap service={statisticsService} />

      <CumulativeChart service={statisticsService} />

      {canUse('biorhythm') && <BiorhythmChart />}

      {canUse('emotionAccumulation') && <EmotionIndicator bus={bus} />}
    </div>,
    document.body
  )
}
