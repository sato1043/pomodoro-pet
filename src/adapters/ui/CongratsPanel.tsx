import { useMemo } from 'react'
import * as styles from './styles/congrats-panel.css'

const CONFETTI_COLORS = ['#ffd54f', '#ff7043', '#42a5f5', '#66bb6a', '#ab47bc', '#ef5350']
const CONFETTI_COUNT = 30

interface ConfettiPiece {
  left: string
  background: string
  animationDuration: string
  animationDelay: string
  borderRadius: string
  width: string
  height: string
}

function generateConfetti(): ConfettiPiece[] {
  return Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    animationDuration: `${1.5 + Math.random() * 1.5}s`,
    animationDelay: `${Math.random() * 0.8}s`,
    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
    width: `${6 + Math.random() * 6}px`,
    height: `${6 + Math.random() * 6}px`,
  }))
}

interface CongratsPanelProps {
  readonly triggerKey: number
}

export function CongratsPanel({ triggerKey }: CongratsPanelProps): JSX.Element {
  const pieces = useMemo(() => generateConfetti(), [triggerKey])

  return (
    <div className={styles.congratsMode}>
      <div className={styles.confettiContainer}>
        {pieces.map((p, i) => (
          <span
            key={i}
            className={styles.confettiPiece}
            style={{
              left: p.left,
              background: p.background,
              animationDuration: p.animationDuration,
              animationDelay: p.animationDelay,
              borderRadius: p.borderRadius,
              width: p.width,
              height: p.height,
            }}
          />
        ))}
      </div>
      <div className={styles.message}>Congratulations!</div>
      <div className={styles.sub}>Pomodoro cycle completed</div>
      <div className={styles.hint} />
    </div>
  )
}
