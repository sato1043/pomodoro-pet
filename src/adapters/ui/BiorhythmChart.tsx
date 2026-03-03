import { useMemo } from 'react'
import type { BiorhythmConfig } from '../../domain/character/value-objects/BiorhythmState'
import { DEFAULT_BIORHYTHM_CONFIG } from '../../domain/character/value-objects/BiorhythmState'
import { useAppDeps } from './AppContext'
import * as styles from './styles/biorhythm-chart.css'

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
export function buildBiorhythmCurves(
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

export function pointsToPath(points: BioPoint[]): string {
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

export default function BiorhythmChart(): JSX.Element {
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
