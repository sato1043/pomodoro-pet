import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import * as overlayStyles from './styles/overlay.css'

function formatClock(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const day = days[date.getDay()]
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}/${m}/${d} ${day} ${h}:${min}`
}

interface CompactHeaderProps {
  readonly children?: ReactNode
}

export function CompactHeader({ children }: CompactHeaderProps): JSX.Element {
  const [clock, setClock] = useState(() => formatClock(new Date()))

  useEffect(() => {
    const id = setInterval(() => {
      setClock(formatClock(new Date()))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return createPortal(
    <div className={overlayStyles.overlayCompact} data-testid="compact-header">
      <div className={overlayStyles.compactTitleRow}>
        <span className={overlayStyles.compactTitle}>Pomodoro Pet</span>
        <span className={overlayStyles.compactClock}>{clock}</span>
      </div>
      {children}
    </div>,
    document.body
  )
}
