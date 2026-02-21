import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import * as styles from './styles/heart-effect.css'

const HEART_COUNT = 10

interface HeartPiece {
  readonly left: string
  readonly top: string
  readonly animationDuration: string
  readonly animationDelay: string
  readonly fontSize: string
}

function generateHearts(): HeartPiece[] {
  return Array.from({ length: HEART_COUNT }, () => ({
    left: `${35 + Math.random() * 30}%`,
    top: `${40 + Math.random() * 20}%`,
    animationDuration: `${1.2 + Math.random() * 0.8}s`,
    animationDelay: `${Math.random() * 0.4}s`,
    fontSize: `${18 + Math.random() * 16}px`,
  }))
}

// SVGハート（WSL2で絵文字フォントが利用不可な場合の対策）
function HeartSvg({ size }: { size: string }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="#e91e63"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

interface HeartEffectProps {
  readonly triggerKey: number
}

export function HeartEffect({ triggerKey }: HeartEffectProps): JSX.Element | null {
  const pieces = useMemo(() => generateHearts(), [triggerKey])

  if (triggerKey === 0) return null

  return createPortal(
    <div className={styles.container}>
      {pieces.map((p, i) => (
        <span
          key={`${triggerKey}-${i}`}
          className={styles.heart}
          style={{
            left: p.left,
            top: p.top,
            animationDuration: p.animationDuration,
            animationDelay: p.animationDelay,
            fontSize: p.fontSize,
          }}
        >
          <HeartSvg size={p.fontSize} />
        </span>
      ))}
    </div>,
    document.body
  )
}
