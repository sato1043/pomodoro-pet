import type { PomodoroStateMachine } from '../../domain/timer/entities/PomodoroStateMachine'
import type { TimerConfig } from '../../domain/timer/value-objects/TimerConfig'
import type { PhaseType } from '../../domain/timer/value-objects/TimerPhase'
import { buildCyclePlan } from '../../domain/timer/value-objects/CyclePlan'
import type { PomodoroOrchestrator } from '../../application/timer/PomodoroOrchestrator'
import { vars } from './styles/theme.css'
import * as styles from './styles/pomodoro-timer-panel.css'

// --- 純粋関数（外部からもimport可能） ---

export function phaseColor(type: PhaseType): { filled: string; unfilled: string } {
  switch (type) {
    case 'work': return { filled: 'rgba(76,175,80,0.85)', unfilled: 'rgba(76,175,80,0.2)' }
    case 'break': return { filled: 'rgba(66,165,245,0.85)', unfilled: 'rgba(66,165,245,0.2)' }
    case 'long-break': return { filled: 'rgba(171,71,188,0.85)', unfilled: 'rgba(171,71,188,0.2)' }
    case 'congrats': return { filled: 'rgba(255,213,79,0.85)', unfilled: 'rgba(255,213,79,0.2)' }
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function phaseLabel(type: PhaseType): string {
  switch (type) {
    case 'work': return 'WORK'
    case 'break': return 'BREAK'
    case 'long-break': return 'LONG BREAK'
    case 'congrats': return 'CONGRATS'
  }
}

const OVERLAY_BASE_BG = 'rgba(0, 0, 0, 0.75)'

export function overlayTintBg(type: PhaseType, progress: number): string {
  const rgb = (() => {
    switch (type) {
      case 'work': return '76,175,80'
      case 'break': return '66,165,245'
      case 'long-break': return '171,71,188'
      case 'congrats': return '255,213,79'
    }
  })()
  const alpha = 0.04 + progress * 0.20
  return `linear-gradient(to bottom, transparent, rgba(${rgb},${alpha.toFixed(3)})), ${OVERLAY_BASE_BG}`
}

// --- SVGアイコンコンポーネント ---

function PauseIcon(): JSX.Element {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11">
      <rect x="2" y="1" width="2.5" height="9" rx="0.5" fill="currentColor" />
      <rect x="6.5" y="1" width="2.5" height="9" rx="0.5" fill="currentColor" />
    </svg>
  )
}

function ResumeIcon(): JSX.Element {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11">
      <polygon points="2,1 10,5.5 2,10" fill="currentColor" />
    </svg>
  )
}

function StopIcon(): JSX.Element {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11">
      <rect x="1" y="1" width="9" height="9" rx="1" fill="currentColor" />
    </svg>
  )
}

const RING_CIRCUMFERENCE = 2 * Math.PI * 90

// --- コンポーネント ---

interface PomodoroTimerPanelProps {
  readonly session: PomodoroStateMachine
  readonly config: TimerConfig
  readonly orchestrator: PomodoroOrchestrator
}

export function PomodoroTimerPanel({ session, config, orchestrator }: PomodoroTimerPanelProps): JSX.Element {
  const phase = session.currentPhase.type
  const colors = phaseColor(phase)
  const dur = session.currentPhase.durationMs
  const ringProgress = Math.max(0, Math.min(1, (dur - session.remainingMs) / dur))
  const ringOffset = RING_CIRCUMFERENCE * (1 - ringProgress)

  // サイクル進捗ドット
  const plan = buildCyclePlan(config).filter(p => p.type !== 'congrats')
  const currentIdx = plan.findIndex(
    p => p.setNumber === session.currentSet && p.type === phase
  )

  const handlePause = (): void => {
    if (session.isRunning) {
      orchestrator.pause()
    } else {
      orchestrator.resume()
    }
  }

  const handleStop = (): void => {
    orchestrator.exitPomodoro()
  }

  return (
    <>
      {/* ドット（overlay直下に配置） */}
      <span className={styles.setDots}>
        {plan.map((p, i) => {
          const c = phaseColor(p.type)
          const color = i < currentIdx ? vars.color.textSecondary
            : i === currentIdx ? c.filled
            : vars.color.surfaceHover
          return <span key={i} style={{ color }}>&#9679;</span>
        })}
      </span>

      {/* pause/resume アイコン */}
      <button className={styles.cornerIcon} onClick={handlePause}>
        {session.isRunning ? <PauseIcon /> : <ResumeIcon />}
      </button>

      {/* stop アイコン */}
      <button className={styles.exitLink} onClick={handleStop}>
        <StopIcon />
      </button>

      {/* メインコンテンツ */}
      <div className={styles.pomodoroMode}>
        <div className={styles.ringContainer}>
          <svg className={styles.ringSvg} viewBox="0 0 200 200" width="200" height="200">
            <circle
              cx="100" cy="100" r="90"
              fill="none" stroke={vars.color.surfaceSubtle} strokeWidth="12"
            />
            <circle
              className={styles.ringProgress}
              cx="100" cy="100" r="90"
              fill="none"
              stroke={colors.filled}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={String(RING_CIRCUMFERENCE)}
              strokeDashoffset={String(ringOffset)}
              transform="rotate(-90 100 100)"
            />
          </svg>
          <div className={styles.ringInner}>
            <span className={`${styles.phaseLabel} ${styles.phaseLabelVariant[phase]}`}>
              {phaseLabel(phase)}
            </span>
            <span className={styles.timerDisplay} style={{ color: colors.filled }}>
              {formatTime(session.remainingMs)}
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
